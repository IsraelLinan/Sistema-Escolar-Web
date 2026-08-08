from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import bcrypt
from app.database import get_conn, put_conn
from app.auth import crear_token, verificar_token

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class LoginRequest(BaseModel):
    username: str
    password: str


class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nueva: str


@router.post("/login")
def login(data: LoginRequest):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT password, colegio_id FROM usuarios WHERE username = %s",
            (data.username,)
        )
        user = cur.fetchone()
        cur.close()

        if not user:
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

        password_hash, colegio_id = user
        if not bcrypt.checkpw(data.password.encode(), password_hash.encode()):
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

        if colegio_id is None:
            raise HTTPException(status_code=403, detail="Tu usuario no tiene un colegio asignado. Contacta al administrador.")

        token = crear_token(data.username, colegio_id)
        return {"success": True, "message": "Login exitoso", "token": token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.post("/cambiar-password")
def cambiar_password(data: CambiarPasswordRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT password FROM usuarios WHERE username = %s", (usuario,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if not bcrypt.checkpw(data.password_actual.encode(), row[0].encode()):
            raise HTTPException(status_code=401, detail="La contraseña actual es incorrecta")

        nuevo_hash = bcrypt.hashpw(data.password_nueva.encode(), bcrypt.gensalt()).decode()
        cur.execute("UPDATE usuarios SET password = %s WHERE username = %s",
                    (nuevo_hash, usuario))
        conn.commit()
        cur.close()
        return {"success": True, "message": "Contraseña actualizada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
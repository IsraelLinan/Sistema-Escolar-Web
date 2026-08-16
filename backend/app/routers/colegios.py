from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import get_conn, put_conn
from app.auth import requiere_super_admin
import bcrypt

router = APIRouter(prefix="/colegios", tags=["Colegios (Super Admin)"])


class ColegioCreate(BaseModel):
    nombre: str
    codigo: str
    logo: str = ""


@router.get("/lista")
def lista_colegios(usuario: str = Depends(requiere_super_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT c.id, c.nombre, c.codigo, c.logo, c.activo, c.created_at,
                   (SELECT COUNT(*) FROM usuarios u WHERE u.colegio_id = c.id) as total_usuarios,
                   (SELECT COUNT(*) FROM estudiantes e WHERE e.colegio_id = c.id) as total_estudiantes
            FROM colegios c
            ORDER BY c.created_at DESC
        """)
        rows = cur.fetchall()
        cur.close()
        return {
            "colegios": [
                {
                    "id": r[0], "nombre": r[1], "codigo": r[2],
                    "logo": r[3] or "", "activo": r[4],
                    "fecha": str(r[5])[:10] if r[5] else "",
                    "total_usuarios": r[6], "total_estudiantes": r[7]
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.post("/crear")
def crear_colegio(data: ColegioCreate, usuario: str = Depends(requiere_super_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM colegios WHERE codigo = %s", (data.codigo.strip().upper(),))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"Ya existe un colegio con el código '{data.codigo}'.")

        cur.execute("""
            INSERT INTO colegios (nombre, codigo, logo)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (data.nombre.strip(), data.codigo.strip().upper(), data.logo or None))
        cid = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return {"success": True, "id": cid}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.put("/{colegio_id}/activar")
def toggle_activo(colegio_id: int, usuario: str = Depends(requiere_super_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE colegios SET activo = NOT activo WHERE id = %s RETURNING activo", (colegio_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Colegio no encontrado")
        conn.commit()
        cur.close()
        return {"success": True, "activo": row[0]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
        
class UsuarioColegioCreate(BaseModel):
    colegio_id: int
    username: str
    password: str


@router.post("/crear-usuario")
def crear_usuario_colegio(data: UsuarioColegioCreate, usuario: str = Depends(requiere_super_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute("SELECT id FROM colegios WHERE id = %s", (data.colegio_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="El colegio no existe.")

        cur.execute("SELECT id FROM usuarios WHERE username = %s", (data.username.strip(),))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"Ya existe un usuario con el nombre '{data.username}'.")

        if len(data.password) < 4:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres.")

        password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()

        cur.execute("""
            INSERT INTO usuarios (username, password, colegio_id, rol)
            VALUES (%s, %s, %s, 'admin')
            RETURNING id
        """, (data.username.strip(), password_hash, data.colegio_id))
        uid = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return {"success": True, "id": uid}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime
import hashlib
import io
import base64
import barcode
from barcode.writer import ImageWriter
from app.database import get_conn, put_conn
from app.auth import verificar_token

router = APIRouter(prefix="/codigos", tags=["Generador de Códigos de Barra"])


class BarcodeRequest(BaseModel):
    nombre: str
    tipo_persona: str  # "Estudiante", "Docente" o "Auxiliar"


def _generar_imagen_barcode(codigo: str) -> str:
    """Genera la imagen PNG en base64 de un código de barras."""
    barcode_obj = barcode.get_barcode_class('code128')(codigo, writer=ImageWriter())
    buffer = io.BytesIO()
    barcode_obj.write(buffer)
    return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"


@router.post("/generar")
def generar_codigo(data: BarcodeRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()

        if data.tipo_persona == "Auxiliar":
            cur.execute(
                "SELECT id, nombre, codigo_barras FROM auxiliares_codigos WHERE LOWER(nombre) = LOWER(%s)",
                (data.nombre.strip(),)
            )
            existente = cur.fetchone()

            if existente:
                cur.close()
                return {
                    "success": True,
                    "nombre": existente[1],
                    "codigo": existente[2],
                    "imagen": _generar_imagen_barcode(existente[2]),
                    "duplicado": True,
                    "mensaje": f"'{existente[1]}' ya está registrado. Se muestra su código existente."
                }

            unique_id = hashlib.md5(data.nombre.strip().encode()).hexdigest()
            cur.execute("SELECT id FROM auxiliares_codigos WHERE codigo_barras = %s", (unique_id,))
            if cur.fetchone():
                unique_id = hashlib.md5((data.nombre.strip() + str(datetime.now())).encode()).hexdigest()

            cur.execute(
                "INSERT INTO auxiliares_codigos (nombre, codigo_barras) VALUES (%s, %s)",
                (data.nombre.strip(), unique_id)
            )
            conn.commit()
            cur.close()
            return {
                "success": True,
                "nombre": data.nombre.strip(),
                "codigo": unique_id,
                "imagen": _generar_imagen_barcode(unique_id),
                "duplicado": False,
                "mensaje": f"'{data.nombre.strip()}' registrado correctamente como Auxiliar."
            }

        # Estudiante o Docente
        tabla = "estudiantes" if data.tipo_persona == "Estudiante" else "docentes"
        cur.execute(
            f"SELECT id, nombre, codigo_barras FROM {tabla} WHERE LOWER(nombre) = LOWER(%s)",
            (data.nombre.strip(),)
        )
        existente = cur.fetchone()

        if existente:
            cur.close()
            return {
                "success": True,
                "nombre": existente[1],
                "codigo": existente[2],
                "imagen": _generar_imagen_barcode(existente[2]),
                "duplicado": True,
                "mensaje": f"'{existente[1]}' ya está registrado. Se muestra su código existente."
            }

        unique_id = hashlib.md5(data.nombre.strip().encode()).hexdigest()
        cur.execute("SELECT id FROM personas WHERE codigo_barras = %s", (unique_id,))
        if cur.fetchone():
            unique_id = hashlib.md5((data.nombre.strip() + str(datetime.now())).encode()).hexdigest()

        cur.execute(
            "INSERT INTO personas (nombre_completo, codigo_barras, tipo_persona) VALUES (%s, %s, %s)",
            (data.nombre, unique_id, data.tipo_persona)
        )
        if data.tipo_persona == "Estudiante":
            cur.execute("INSERT INTO estudiantes (nombre, codigo_barras) VALUES (%s, %s)",
                        (data.nombre, unique_id))
        elif data.tipo_persona == "Docente":
            cur.execute("INSERT INTO docentes (nombre, codigo_barras) VALUES (%s, %s)",
                        (data.nombre, unique_id))
        conn.commit()
        cur.close()
        return {
            "success": True,
            "nombre": data.nombre,
            "codigo": unique_id,
            "imagen": _generar_imagen_barcode(unique_id),
            "duplicado": False,
            "mensaje": f"'{data.nombre}' registrado correctamente como {data.tipo_persona}."
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.get("/buscar")
def buscar_codigo(nombre: str, tipo: str = "Estudiante", usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        if tipo == "Auxiliar":
            cur.execute(
                "SELECT codigo_barras FROM auxiliares_codigos WHERE nombre ILIKE %s LIMIT 1",
                (f"%{nombre}%",)
            )
        else:
            tabla = "estudiantes" if tipo == "Estudiante" else "docentes"
            cur.execute(
                f"SELECT codigo_barras FROM {tabla} WHERE nombre ILIKE %s LIMIT 1",
                (f"%{nombre}%",)
            )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        codigo = row[0]
        cur.close()
        return {"codigo": codigo, "imagen": _generar_imagen_barcode(codigo)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
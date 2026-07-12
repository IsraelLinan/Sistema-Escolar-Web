from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import get_conn, put_conn
from app.auth import verificar_token
from app.telegram_bot import enviar_notificacion
import asyncio

router = APIRouter(prefix="/apoderados", tags=["Apoderados"])


class ApoderadoUpdate(BaseModel):
    estudiante_id: int
    apoderado_nombre: str
    apoderado_chat_id: str


@router.get("/lista")
def lista_estudiantes_apoderados(usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, nombre,
                   COALESCE(apoderado_nombre, '') as apoderado_nombre,
                   COALESCE(apoderado_chat_id, '') as apoderado_chat_id
            FROM estudiantes
            ORDER BY nombre
        """)
        rows = cur.fetchall()
        cur.close()
        return {
            "estudiantes": [
                {
                    "id": r[0],
                    "nombre": r[1],
                    "apoderado_nombre": r[2],
                    "apoderado_chat_id": r[3]
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.put("/actualizar")
def actualizar_apoderado(data: ApoderadoUpdate, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE estudiantes
            SET apoderado_nombre = %s, apoderado_chat_id = %s
            WHERE id = %s
        """, (data.apoderado_nombre, data.apoderado_chat_id, data.estudiante_id))
        conn.commit()
        cur.close()
        return {"success": True, "message": "Apoderado actualizado correctamente"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.post("/probar-notificacion")
def probar_notificacion(data: dict, usuario: str = Depends(verificar_token)):
    chat_id = data.get("chat_id")
    nombre = data.get("nombre", "Estudiante")
    if not chat_id:
        raise HTTPException(status_code=400, detail="chat_id requerido")
    mensaje = (
        f"✅ <b>NOTIFICACIÓN DE PRUEBA</b>\n\n"
        f"👤 <b>Estudiante:</b> {nombre}\n"
        f"📱 Telegram configurado correctamente\n\n"
        f"<i>Sistema de Gestión Escolar</i>"
    )
    asyncio.run(enviar_notificacion(chat_id, mensaje))
    return {"success": True, "message": "Notificación enviada"}
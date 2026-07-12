from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import get_conn, put_conn
from app.auth import verificar_token
from app.utils import now_lima
from app.telegram_bot import enviar_notificacion, construir_mensaje_ingreso, construir_mensaje_salida
import asyncio

router = APIRouter(prefix="/estudiantes", tags=["Estudiantes"])


class IngresoRequest(BaseModel):
    codigo_barras: str


@router.post("/ingreso")
def ingreso_estudiante(data: IngresoRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, apoderado_chat_id FROM estudiantes WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        estudiante_id, nombre, chat_id = row

        cur.execute("""
            SELECT id FROM ingresos_estudiantes
            WHERE estudiante_id = %s AND DATE(hora_ingreso) = %s
        """, (estudiante_id, now_lima().date()))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"{nombre} ya registró su ingreso hoy")

        cur.execute("INSERT INTO ingresos_estudiantes (estudiante_id, hora_ingreso) VALUES (%s, %s)",
                    (estudiante_id, now_lima()))
        conn.commit()
        hora = now_lima().strftime('%H:%M:%S')
        cur.close()

        if chat_id:
            mensaje = construir_mensaje_ingreso(nombre, hora, "estudiante")
            asyncio.run(enviar_notificacion(chat_id, mensaje))

        return {"success": True, "nombre": nombre, "hora": hora, "tipo": "ingreso"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.post("/salida")
def salida_estudiante(data: IngresoRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, apoderado_chat_id FROM estudiantes WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        estudiante_id, nombre, chat_id = row

        cur.execute("""
            SELECT id FROM ingresos_estudiantes
            WHERE estudiante_id = %s AND DATE(hora_ingreso) = %s AND hora_salida IS NOT NULL
        """, (estudiante_id, now_lima().date()))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"{nombre} ya registró su salida hoy")

        cur.execute("""
            SELECT id FROM ingresos_estudiantes
            WHERE estudiante_id = %s AND hora_salida IS NULL
            ORDER BY hora_ingreso DESC LIMIT 1
        """, (estudiante_id,))
        ingreso = cur.fetchone()
        if not ingreso:
            raise HTTPException(status_code=400, detail="No hay ingreso pendiente para este estudiante")

        cur.execute("UPDATE ingresos_estudiantes SET hora_salida = %s WHERE id = %s",
                    (now_lima(), ingreso[0]))
        conn.commit()
        hora = now_lima().strftime('%H:%M:%S')
        cur.close()

        if chat_id:
            mensaje = construir_mensaje_salida(nombre, hora, "estudiante")
            asyncio.run(enviar_notificacion(chat_id, mensaje))

        return {"success": True, "nombre": nombre, "hora": hora, "tipo": "salida"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
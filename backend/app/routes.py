from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_conn, put_conn
from datetime import datetime, date
import pytz
import barcode
from barcode.writer import ImageWriter
from app.telegram_bot import enviar_notificacion, construir_mensaje_ingreso, construir_mensaje_salida
import asyncio
import hashlib
import io
import base64

LIMA_TZ = pytz.timezone('America/Lima')

def now_lima():
    return datetime.now(LIMA_TZ).replace(tzinfo=None)

router = APIRouter()

# ── Modelos ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class BarcodeRequest(BaseModel):
    nombre: str
    tipo_persona: str  # "Estudiante" o "Docente"

class IngresoRequest(BaseModel):
    codigo_barras: str

# ── LOGIN ─────────────────────────────────────────────────────────────────────

@router.post("/auth/login")
def login(data: LoginRequest):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM usuarios WHERE username = %s AND password = %s",
            (data.username, data.password)
        )
        user = cur.fetchone()
        cur.close()
        if user:
            return {"success": True, "message": "Login exitoso"}
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

# ── ESTUDIANTES ───────────────────────────────────────────────────────────────

@router.post("/estudiantes/ingreso")
def ingreso_estudiante(data: IngresoRequest):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, apoderado_chat_id FROM estudiantes WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        estudiante_id, nombre, chat_id = row
        cur.execute("INSERT INTO ingresos_estudiantes (estudiante_id, hora_ingreso) VALUES (%s, %s)", (estudiante_id, now_lima()))
        conn.commit()
        hora = now_lima().strftime('%H:%M:%S')
        cur.close()

        # Notificación Telegram
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

@router.post("/estudiantes/salida")
def salida_estudiante(data: IngresoRequest):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, apoderado_chat_id FROM estudiantes WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        estudiante_id, nombre, chat_id = row
        cur.execute(
            "SELECT id FROM ingresos_estudiantes WHERE estudiante_id = %s AND hora_salida IS NULL ORDER BY hora_ingreso DESC LIMIT 1",
            (estudiante_id,)
        )
        ingreso = cur.fetchone()
        if not ingreso:
            raise HTTPException(status_code=400, detail="No hay ingreso pendiente para este estudiante")
        cur.execute("UPDATE ingresos_estudiantes SET hora_salida = %s WHERE id = %s",
                    (now_lima(), ingreso[0]))
        conn.commit()
        hora = now_lima().strftime('%H:%M:%S')
        cur.close()

        # Notificación Telegram
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

# ── DOCENTES ──────────────────────────────────────────────────────────────────

@router.post("/docentes/ingreso")
def ingreso_docente(data: IngresoRequest):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre FROM docentes WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        docente_id, nombre = row
        cur.execute("INSERT INTO ingresos_docentes (docente_id, hora_ingreso) VALUES (%s, %s)", (docente_id, now_lima()))
        conn.commit()
        hora = datetime.now().strftime('%H:%M:%S')
        cur.close()
        return {"success": True, "nombre": nombre, "hora": hora, "tipo": "ingreso"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.post("/docentes/salida")
def salida_docente(data: IngresoRequest):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre FROM docentes WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        docente_id, nombre = row
        cur.execute(
            "SELECT id FROM ingresos_docentes WHERE docente_id = %s AND hora_salida IS NULL ORDER BY hora_ingreso DESC LIMIT 1",
            (docente_id,)
        )
        ingreso = cur.fetchone()
        if not ingreso:
            raise HTTPException(status_code=400, detail="No hay ingreso pendiente para este docente")
        cur.execute("UPDATE ingresos_docentes SET hora_salida = %s WHERE id = %s",
                    (datetime.now(), ingreso[0]))
        conn.commit()
        hora = datetime.now().strftime('%H:%M:%S')
        cur.close()
        return {"success": True, "nombre": nombre, "hora": hora, "tipo": "salida"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

# ── GENERADOR DE CÓDIGOS ──────────────────────────────────────────────────────

@router.post("/codigos/generar")
def generar_codigo(data: BarcodeRequest):
    conn = get_conn()
    try:
        unique_id = hashlib.md5(data.nombre.encode()).hexdigest()
        cur = conn.cursor()
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

        # Generar imagen del código en base64
        barcode_obj = barcode.get_barcode_class('code128')(unique_id, writer=ImageWriter())
        buffer = io.BytesIO()
        barcode_obj.write(buffer)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        cur.close()
        return {
            "success": True,
            "nombre": data.nombre,
            "codigo": unique_id,
            "imagen": f"data:image/png;base64,{img_base64}"
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

# ── REPORTES ──────────────────────────────────────────────────────────────────

@router.get("/reportes/asistencia")
def reporte_asistencia(fecha: str = None):
    conn = get_conn()
    try:
        cur = conn.cursor()
        fecha_filtro = fecha if fecha else date.today().isoformat()

        cur.execute("""
            SELECT e.nombre, ie.hora_ingreso, ie.hora_salida, 'Estudiante' as tipo
            FROM ingresos_estudiantes ie
            JOIN estudiantes e ON e.id = ie.estudiante_id
            WHERE DATE(ie.hora_ingreso) = %s
            UNION ALL
            SELECT d.nombre, id2.hora_ingreso, id2.hora_salida, 'Docente' as tipo
            FROM ingresos_docentes id2
            JOIN docentes d ON d.id = id2.docente_id
            WHERE DATE(id2.hora_ingreso) = %s
            ORDER BY hora_ingreso
        """, (fecha_filtro, fecha_filtro))

        rows = cur.fetchall()
        cur.close()
        return {
            "fecha": fecha_filtro,
            "registros": [
                {
                    "nombre": r[0],
                    "hora_ingreso": r[1].strftime('%H:%M:%S') if r[1] else None,
                    "hora_salida": r[2].strftime('%H:%M:%S') if r[2] else None,
                    "tipo": r[3]
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
        
# ── BUSCAR CÓDIGO POR NOMBRE ──────────────────────────────────────────────────

@router.get("/codigos/buscar")
def buscar_codigo(nombre: str):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT codigo_barras FROM estudiantes WHERE nombre ILIKE %s LIMIT 1",
            (f"%{nombre}%",)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        codigo = row[0]

        # Generar imagen
        barcode_obj = barcode.get_barcode_class('code128')(codigo, writer=ImageWriter())
        buffer = io.BytesIO()
        barcode_obj.write(buffer)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        cur.close()
        return {
            "codigo": codigo,
            "imagen": f"data:image/png;base64,{img_base64}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
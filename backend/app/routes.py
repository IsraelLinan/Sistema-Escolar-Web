from app.auth import crear_token, verificar_token
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import get_conn, put_conn
from datetime import datetime, date
import bcrypt
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
            "SELECT password FROM usuarios WHERE username = %s",
            (data.username,)
        )
        user = cur.fetchone()
        cur.close()

        if not user:
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

        password_hash = user[0]
        if not bcrypt.checkpw(data.password.encode(), password_hash.encode()):
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

        token = crear_token(data.username)
        return {"success": True, "message": "Login exitoso", "token": token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

# ── ESTUDIANTES ───────────────────────────────────────────────────────────────

@router.post("/estudiantes/ingreso")
def ingreso_estudiante(data: IngresoRequest, usuario: str = Depends(verificar_token)):
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
def salida_estudiante(data: IngresoRequest, usuario: str = Depends(verificar_token)):
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
def ingreso_docente(data: IngresoRequest, usuario: str = Depends(verificar_token)):
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
def salida_docente(data: IngresoRequest, usuario: str = Depends(verificar_token)):
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
def generar_codigo(data: BarcodeRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()

        # Verificar duplicados
        tabla = "estudiantes" if data.tipo_persona == "Estudiante" else "docentes"
        cur.execute(
            f"SELECT id, nombre, codigo_barras FROM {tabla} WHERE LOWER(nombre) = LOWER(%s)",
            (data.nombre.strip(),)
        )
        existente = cur.fetchone()

        if existente:
            # Ya existe, devolver el código existente con su imagen
            codigo = existente[2]
            barcode_obj = barcode.get_barcode_class('code128')(codigo, writer=ImageWriter())
            buffer = io.BytesIO()
            barcode_obj.write(buffer)
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            cur.close()
            return {
                "success": True,
                "nombre": existente[1],
                "codigo": codigo,
                "imagen": f"data:image/png;base64,{img_base64}",
                "duplicado": True,
                "mensaje": f"'{existente[1]}' ya está registrado. Se muestra su código existente."
            }

        # No existe, crear nuevo
        unique_id = hashlib.md5(data.nombre.strip().encode()).hexdigest()

        # Verificar que el hash no esté ya en uso
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

        barcode_obj = barcode.get_barcode_class('code128')(unique_id, writer=ImageWriter())
        buffer = io.BytesIO()
        barcode_obj.write(buffer)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        cur.close()
        return {
            "success": True,
            "nombre": data.nombre,
            "codigo": unique_id,
            "imagen": f"data:image/png;base64,{img_base64}",
            "duplicado": False,
            "mensaje": f"'{data.nombre}' registrado correctamente como {data.tipo_persona}."
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

# ── REPORTES ──────────────────────────────────────────────────────────────────

@router.get("/reportes/asistencia")
def reporte_asistencia(fecha: str = None, tipo: str = None, pagina: int = 1, por_pagina: int = 20, usuario: str = Depends(verificar_token)):
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
            UNION ALL
            SELECT a.apellidos || ', ' || a.nombres, ia.hora_ingreso, ia.hora_salida, 'Auxiliar' as tipo
            FROM ingresos_auxiliares ia
            JOIN auxiliares a ON a.id = ia.auxiliar_id
            WHERE DATE(ia.hora_ingreso) = %s
            ORDER BY hora_ingreso
        """, (fecha_filtro, fecha_filtro, fecha_filtro))

        rows = cur.fetchall()
        cur.close()

        registros = [
            {
                "nombre": r[0],
                "hora_ingreso": r[1].strftime('%H:%M:%S') if r[1] else None,
                "hora_salida": r[2].strftime('%H:%M:%S') if r[2] else None,
                "tipo": r[3]
            }
            for r in rows
        ]

        if tipo and tipo != 'Todos':
            registros = [r for r in registros if r['tipo'] == tipo]

        total = len(registros)
        inicio = (pagina - 1) * por_pagina
        fin = inicio + por_pagina
        registros_paginados = registros[inicio:fin]

        return {
            "fecha": fecha_filtro,
            "registros": registros_paginados,
            "total": total,
            "pagina": pagina,
            "por_pagina": por_pagina,
            "total_paginas": (total + por_pagina - 1) // por_pagina
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
        
# ── BUSCAR CÓDIGO POR NOMBRE ──────────────────────────────────────────────────

@router.get("/codigos/buscar")
def buscar_codigo(nombre: str, usuario: str = Depends(verificar_token)):
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
        
        
# ── GESTIÓN DE APODERADOS ─────────────────────────────────────────────────────

class ApoderadoUpdate(BaseModel):
    estudiante_id: int
    apoderado_nombre: str
    apoderado_chat_id: str

@router.get("/apoderados/lista")
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

@router.put("/apoderados/actualizar")
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

@router.post("/apoderados/probar-notificacion")
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

# ── AUXILIARES ────────────────────────────────────────────────────────────────

class AuxiliarCreate(BaseModel):
    nombres: str
    apellidos: str
    dni: str = ""
    fecha_nacimiento: str = ""
    genero: str = "Masculino"
    telefono: str = ""
    email: str = ""
    direccion: str = ""
    area_asignada: str = ""
    turno: str = ""
    fecha_ingreso: str = ""
    foto: str = ""

class AuxiliarUpdate(AuxiliarCreate):
    id: int

@router.get("/auxiliares/lista")
def lista_auxiliares(busqueda: str = "", turno: str = "", usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        query = """
            SELECT id, nombres, apellidos, codigo, dni, fecha_nacimiento,
                   genero, telefono, email, direccion, area_asignada,
                   turno, fecha_ingreso, foto
            FROM auxiliares
            WHERE (LOWER(nombres) LIKE %s OR LOWER(apellidos) LIKE %s
                   OR LOWER(codigo) LIKE %s OR dni LIKE %s)
        """
        params = [f"%{busqueda.lower()}%"] * 4
        if turno:
            query += " AND turno = %s"
            params.append(turno)
        query += " ORDER BY apellidos, nombres"
        cur.execute(query, params)
        rows = cur.fetchall()
        cur.close()
        return {
            "auxiliares": [
                {
                    "id": r[0], "nombres": r[1], "apellidos": r[2],
                    "codigo": r[3], "dni": r[4] or "",
                    "fecha_nacimiento": str(r[5]) if r[5] else "",
                    "genero": r[6] or "", "telefono": r[7] or "",
                    "email": r[8] or "", "direccion": r[9] or "",
                    "area_asignada": r[10] or "", "turno": r[11] or "",
                    "fecha_ingreso": str(r[12]) if r[12] else "",
                    "foto": r[13] or ""
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.post("/auxiliares/crear")
def crear_auxiliar(data: AuxiliarCreate, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        # Generar código automático
        cur.execute("SELECT COUNT(*) FROM auxiliares")
        count = cur.fetchone()[0]
        codigo = f"AUX{str(count + 1).zfill(5)}"
        cur.execute("""
            INSERT INTO auxiliares (nombres, apellidos, codigo, dni, fecha_nacimiento,
                genero, telefono, email, direccion, area_asignada, turno, fecha_ingreso, foto)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, codigo
        """, (
            data.nombres, data.apellidos, codigo,
            data.dni or None, data.fecha_nacimiento or None,
            data.genero, data.telefono, data.email, data.direccion,
            data.area_asignada, data.turno,
            data.fecha_ingreso or None, data.foto
        ))
        result = cur.fetchone()
        conn.commit()
        cur.close()
        return {"success": True, "id": result[0], "codigo": result[1]}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.put("/auxiliares/actualizar")
def actualizar_auxiliar(data: AuxiliarUpdate, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE auxiliares SET nombres=%s, apellidos=%s, dni=%s,
                fecha_nacimiento=%s, genero=%s, telefono=%s, email=%s,
                direccion=%s, area_asignada=%s, turno=%s, fecha_ingreso=%s, foto=%s
            WHERE id=%s
        """, (
            data.nombres, data.apellidos, data.dni or None,
            data.fecha_nacimiento or None, data.genero, data.telefono,
            data.email, data.direccion, data.area_asignada, data.turno,
            data.fecha_ingreso or None, data.foto, data.id
        ))
        conn.commit()
        cur.close()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.delete("/auxiliares/eliminar/{auxiliar_id}")
def eliminar_auxiliar(auxiliar_id: int, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM auxiliares WHERE id = %s", (auxiliar_id,))
        conn.commit()
        cur.close()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
        
        
# ── ASISTENCIA AUXILIARES ─────────────────────────────────────────────────────

class AuxiliarIngresoRequest(BaseModel):
    busqueda: str  # DNI o nombre

@router.post("/auxiliares/ingreso")
def ingreso_auxiliar(data: AuxiliarIngresoRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, nombres, apellidos FROM auxiliares
            WHERE dni = %s OR LOWER(nombres || ' ' || apellidos) LIKE %s
            LIMIT 1
        """, (data.busqueda, f"%{data.busqueda.lower()}%"))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Auxiliar no encontrado")
        auxiliar_id, nombres, apellidos = row
        nombre_completo = f"{apellidos}, {nombres}"
        cur.execute("""
            INSERT INTO ingresos_auxiliares (auxiliar_id, hora_ingreso)
            VALUES (%s, %s)
        """, (auxiliar_id, now_lima()))
        conn.commit()
        hora = now_lima().strftime('%H:%M:%S')
        cur.close()
        return {"success": True, "nombre": nombre_completo, "hora": hora, "tipo": "ingreso"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.post("/auxiliares/salida")
def salida_auxiliar(data: AuxiliarIngresoRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, nombres, apellidos FROM auxiliares
            WHERE dni = %s OR LOWER(nombres || ' ' || apellidos) LIKE %s
            LIMIT 1
        """, (data.busqueda, f"%{data.busqueda.lower()}%"))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Auxiliar no encontrado")
        auxiliar_id, nombres, apellidos = row
        nombre_completo = f"{apellidos}, {nombres}"
        cur.execute("""
            SELECT id FROM ingresos_auxiliares
            WHERE auxiliar_id = %s AND hora_salida IS NULL
            ORDER BY hora_ingreso DESC LIMIT 1
        """, (auxiliar_id,))
        ingreso = cur.fetchone()
        if not ingreso:
            raise HTTPException(status_code=400, detail="No hay ingreso pendiente para este auxiliar")
        cur.execute("UPDATE ingresos_auxiliares SET hora_salida = %s WHERE id = %s",
                    (now_lima(), ingreso[0]))
        conn.commit()
        hora = now_lima().strftime('%H:%M:%S')
        cur.close()
        return {"success": True, "nombre": nombre_completo, "hora": hora, "tipo": "salida"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
        
# ── CARNETS ───────────────────────────────────────────────────────────────────

@router.get("/carnets/lista")
def lista_carnets(tipo: str = "Estudiante", busqueda: str = "", usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        if tipo == "Estudiante":
            cur.execute("""
                SELECT id, nombre, codigo_barras, dni, grado, seccion, anio, foto
                FROM estudiantes
                WHERE (LOWER(nombre) LIKE %s OR dni LIKE %s)
                ORDER BY nombre
            """, (f"%{busqueda.lower()}%", f"%{busqueda}%"))
            rows = cur.fetchall()
            cur.close()
            return {
                "carnets": [
                    {
                        "id": r[0], "nombre": r[1], "codigo_barras": r[2],
                        "dni": r[3] or "", "grado": r[4] or "",
                        "seccion": r[5] or "", "anio": r[6] or "2026",
                        "foto": r[7] or "", "tipo": "Estudiante"
                    }
                    for r in rows
                ]
            }
        else:
            cur.execute("""
                SELECT id, nombre, codigo_barras, dni, especialidad, anio, foto
                FROM docentes
                WHERE (LOWER(nombre) LIKE %s OR dni LIKE %s)
                ORDER BY nombre
            """, (f"%{busqueda.lower()}%", f"%{busqueda}%"))
            rows = cur.fetchall()
            cur.close()
            return {
                "carnets": [
                    {
                        "id": r[0], "nombre": r[1], "codigo_barras": r[2],
                        "dni": r[3] or "", "especialidad": r[4] or "",
                        "anio": r[5] or "2026", "foto": r[6] or "",
                        "tipo": "Docente"
                    }
                    for r in rows
                ]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.get("/carnets/codigo-imagen/{codigo_barras}")
def get_codigo_imagen(codigo_barras: str):
    try:
        barcode_obj = barcode.get_barcode_class('code128')(codigo_barras, writer=ImageWriter())
        buffer = io.BytesIO()
        barcode_obj.write(buffer)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return {"imagen": f"data:image/png;base64,{img_base64}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
        
# ── FOTOCHECKS GUARDADOS ──────────────────────────────────────────────────────

class FotocheckSave(BaseModel):
    nombre_escuela: str = ""
    logo_escuela: str = ""
    nombre: str
    grado: str = ""
    anio: str = "2026"
    foto: str = ""
    codigo_barras: str = ""
    imagen_carnet: str = ""

@router.post("/fotochecks/guardar")
def guardar_fotocheck(data: FotocheckSave, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        # Buscar estudiante_id si existe
        cur.execute("SELECT id FROM estudiantes WHERE LOWER(nombre) LIKE %s LIMIT 1",
                    (f"%{data.nombre.lower()}%",))
        est = cur.fetchone()
        estudiante_id = est[0] if est else None

        cur.execute("""
            INSERT INTO fotochecks (estudiante_id, nombre_escuela, logo_escuela,
                nombre, grado, anio, foto, codigo_barras, imagen_carnet)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (estudiante_id, data.nombre_escuela, data.logo_escuela,
              data.nombre, data.grado, data.anio, data.foto,
              data.codigo_barras, data.imagen_carnet))
        fid = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return {"success": True, "id": fid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.get("/fotochecks/lista")
def lista_fotochecks(busqueda: str = "", pagina: int = 1, por_pagina: int = 12, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, nombre_escuela, logo_escuela, nombre, grado,
                   anio, foto, codigo_barras, imagen_carnet, created_at
            FROM fotochecks
            WHERE LOWER(nombre) LIKE %s
            ORDER BY created_at DESC
        """, (f"%{busqueda.lower()}%",))
        rows = cur.fetchall()
        cur.close()

        todos = [
            {
                "id": r[0], "nombre_escuela": r[1] or "",
                "logo_escuela": r[2] or "", "nombre": r[3],
                "grado": r[4] or "", "anio": r[5] or "2026",
                "foto": r[6] or "", "codigo_barras": r[7] or "",
                "imagen_carnet": r[8] or "",
                "fecha": str(r[9])[:10] if r[9] else ""
            }
            for r in rows
        ]

        total = len(todos)
        inicio = (pagina - 1) * por_pagina
        fin = inicio + por_pagina

        return {
            "fotochecks": todos[inicio:fin],
            "total": total,
            "pagina": pagina,
            "por_pagina": por_pagina,
            "total_paginas": (total + por_pagina - 1) // por_pagina
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.delete("/fotochecks/eliminar/{fotocheck_id}")
def eliminar_fotocheck(fotocheck_id: int, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM fotochecks WHERE id = %s", (fotocheck_id,))
        conn.commit()
        cur.close()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
        
# ── CAMBIAR CONTRASEÑA ────────────────────────────────────────────────────────

class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nueva: str

@router.post("/auth/cambiar-password")
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
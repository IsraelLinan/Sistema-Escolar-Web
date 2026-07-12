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

        # Verificar si ya registró ingreso hoy
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

        # Verificar si ya registró salida hoy
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

        # Verificar si ya registró ingreso hoy
        cur.execute("""
            SELECT id FROM ingresos_docentes
            WHERE docente_id = %s AND DATE(hora_ingreso) = %s
        """, (docente_id, now_lima().date()))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"{nombre} ya registró su ingreso hoy")

        cur.execute("INSERT INTO ingresos_docentes (docente_id, hora_ingreso) VALUES (%s, %s)",
                    (docente_id, now_lima()))
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

        # Verificar si ya registró salida hoy
        cur.execute("""
            SELECT id FROM ingresos_docentes
            WHERE docente_id = %s AND DATE(hora_ingreso) = %s AND hora_salida IS NOT NULL
        """, (docente_id, now_lima().date()))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"{nombre} ya registró su salida hoy")

        cur.execute("""
            SELECT id FROM ingresos_docentes
            WHERE docente_id = %s AND hora_salida IS NULL
            ORDER BY hora_ingreso DESC LIMIT 1
        """, (docente_id,))
        ingreso = cur.fetchone()
        if not ingreso:
            raise HTTPException(status_code=400, detail="No hay ingreso pendiente para este docente")
        cur.execute("UPDATE ingresos_docentes SET hora_salida = %s WHERE id = %s",
                    (now_lima(), ingreso[0]))
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

        if data.tipo_persona == "Auxiliar":
            cur.execute(
                "SELECT id, nombre, codigo_barras FROM auxiliares_codigos WHERE LOWER(nombre) = LOWER(%s)",
                (data.nombre.strip(),)
            )
            existente = cur.fetchone()

            if existente:
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

            unique_id = hashlib.md5(data.nombre.strip().encode()).hexdigest()
            cur.execute("SELECT id FROM auxiliares_codigos WHERE codigo_barras = %s", (unique_id,))
            if cur.fetchone():
                unique_id = hashlib.md5((data.nombre.strip() + str(datetime.now())).encode()).hexdigest()

            cur.execute(
                "INSERT INTO auxiliares_codigos (nombre, codigo_barras) VALUES (%s, %s)",
                (data.nombre.strip(), unique_id)
            )
            conn.commit()

            barcode_obj = barcode.get_barcode_class('code128')(unique_id, writer=ImageWriter())
            buffer = io.BytesIO()
            barcode_obj.write(buffer)
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            cur.close()
            return {
                "success": True,
                "nombre": data.nombre.strip(),
                "codigo": unique_id,
                "imagen": f"data:image/png;base64,{img_base64}",
                "duplicado": False,
                "mensaje": f"'{data.nombre.strip()}' registrado correctamente como Auxiliar."
            }

        # Estudiante o Docente (comportamiento original)
        tabla = "estudiantes" if data.tipo_persona == "Estudiante" else "docentes"
        cur.execute(
            f"SELECT id, nombre, codigo_barras FROM {tabla} WHERE LOWER(nombre) = LOWER(%s)",
            (data.nombre.strip(),)
        )
        existente = cur.fetchone()

        if existente:
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
    except HTTPException:
        raise
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
            SELECT ac.nombre, ia.hora_ingreso, ia.hora_salida, 'Auxiliar' as tipo
            FROM ingresos_auxiliares ia
            JOIN auxiliares_codigos ac ON ac.id = ia.auxiliar_id
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
    cargo: str = "Auxiliar"
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
def lista_auxiliares(busqueda: str = "", turno: str = "", cargo: str = "", usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        query = """
            SELECT id, nombres, apellidos, codigo, dni, fecha_nacimiento,
                   genero, telefono, email, direccion, area_asignada,
                   turno, fecha_ingreso, foto, cargo, codigo_barras
            FROM auxiliares
            WHERE (LOWER(nombres) LIKE %s OR LOWER(apellidos) LIKE %s
                   OR LOWER(codigo) LIKE %s OR dni LIKE %s)
        """
        params = [f"%{busqueda.lower()}%"] * 4
        if turno:
            query += " AND turno = %s"
            params.append(turno)
        if cargo:
            query += " AND cargo = %s"
            params.append(cargo)
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
                    "foto": r[13] or "", "cargo": r[14] or "Auxiliar",
                    "codigo_barras": r[15] or ""
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
        prefijo = {"Docente": "DOC", "Auxiliar": "AUX", "Personal Administrativo": "PA"}.get(data.cargo, "AUX")
        cur.execute("SELECT COUNT(*) FROM auxiliares WHERE cargo = %s", (data.cargo,))
        count = cur.fetchone()[0]
        codigo = f"{prefijo}{str(count + 1).zfill(5)}"
        codigo_barras = hashlib.md5(f"{data.nombres} {data.apellidos} {codigo}".encode()).hexdigest()

        cur.execute("""
            INSERT INTO auxiliares (nombres, apellidos, codigo, cargo, dni, fecha_nacimiento,
                genero, telefono, email, direccion, area_asignada, turno, fecha_ingreso, foto, codigo_barras)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, codigo
        """, (
            data.nombres, data.apellidos, codigo, data.cargo,
            data.dni or None, data.fecha_nacimiento or None,
            data.genero, data.telefono, data.email, data.direccion,
            data.area_asignada, data.turno,
            data.fecha_ingreso or None, data.foto, codigo_barras
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
            UPDATE auxiliares SET nombres=%s, apellidos=%s, cargo=%s, dni=%s,
                fecha_nacimiento=%s, genero=%s, telefono=%s, email=%s,
                direccion=%s, area_asignada=%s, turno=%s, fecha_ingreso=%s, foto=%s
            WHERE id=%s
        """, (
            data.nombres, data.apellidos, data.cargo, data.dni or None,
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
def ingreso_auxiliar(data: IngresoRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre FROM auxiliares_codigos WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        auxiliar_id, nombre_completo = row

        cur.execute("""
            SELECT id FROM ingresos_auxiliares
            WHERE auxiliar_id = %s AND DATE(hora_ingreso) = %s
        """, (auxiliar_id, now_lima().date()))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"{nombre_completo} ya registró su ingreso hoy")

        cur.execute("INSERT INTO ingresos_auxiliares (auxiliar_id, hora_ingreso) VALUES (%s, %s)",
                    (auxiliar_id, now_lima()))
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
def salida_auxiliar(data: IngresoRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre FROM auxiliares_codigos WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        auxiliar_id, nombre_completo = row

        cur.execute("""
            SELECT id FROM ingresos_auxiliares
            WHERE auxiliar_id = %s AND DATE(hora_ingreso) = %s AND hora_salida IS NOT NULL
        """, (auxiliar_id, now_lima().date()))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"{nombre_completo} ya registró su salida hoy")

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
    tipo: str = "Estudiante"

@router.post("/fotochecks/guardar")
def guardar_fotocheck(data: FotocheckSave, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()

        estudiante_id = None
        docente_id = None

        if data.tipo == "Estudiante":
            cur.execute("SELECT id FROM estudiantes WHERE LOWER(nombre) LIKE %s LIMIT 1",
                        (f"%{data.nombre.lower()}%",))
            est = cur.fetchone()
            estudiante_id = est[0] if est else None

            grado_val = None
            seccion_val = None
            if data.grado:
                partes = data.grado.split(' - ')
                grado_val = partes[0].strip() if partes else data.grado
                seccion_val = partes[1].strip() if len(partes) > 1 else None

            if estudiante_id and (grado_val or seccion_val):
                cur.execute("""
                    UPDATE estudiantes SET grado = %s, seccion = %s WHERE id = %s
                """, (grado_val, seccion_val, estudiante_id))

        elif data.tipo == "Docente":
            cur.execute("SELECT id FROM docentes WHERE LOWER(nombre) LIKE %s LIMIT 1",
                        (f"%{data.nombre.lower()}%",))
            doc = cur.fetchone()
            docente_id = doc[0] if doc else None

        # Para Auxiliar no hay columna dedicada de FK en fotochecks; se guarda solo por nombre

        cur.execute("""
            INSERT INTO fotochecks (estudiante_id, docente_id, nombre_escuela, logo_escuela,
                nombre, grado, anio, foto, codigo_barras, imagen_carnet, tipo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (estudiante_id, docente_id, data.nombre_escuela, data.logo_escuela,
              data.nombre, data.grado, data.anio, data.foto,
              data.codigo_barras, data.imagen_carnet, data.tipo))
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
def lista_fotochecks(busqueda: str = "", tipo: str = "Estudiante", pagina: int = 1, por_pagina: int = 12, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, nombre_escuela, logo_escuela, nombre, grado,
                   anio, foto, codigo_barras, imagen_carnet, created_at, tipo
            FROM fotochecks
            WHERE LOWER(nombre) LIKE %s AND tipo = %s
            ORDER BY created_at DESC
        """, (f"%{busqueda.lower()}%", tipo))
        rows = cur.fetchall()
        cur.close()

        todos = [
            {
                "id": r[0], "nombre_escuela": r[1] or "",
                "logo_escuela": r[2] or "", "nombre": r[3],
                "grado": r[4] or "", "anio": r[5] or "2026",
                "foto": r[6] or "", "codigo_barras": r[7] or "",
                "imagen_carnet": r[8] or "",
                "fecha": str(r[9])[:10] if r[9] else "",
                "tipo": r[10] or "Estudiante"
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
        
# ── AGENDA ESCOLAR ────────────────────────────────────────────────────────────

class EventoCreate(BaseModel):
    titulo: str
    descripcion: str = ""
    fecha_inicio: str
    fecha_fin: str = ""
    hora_inicio: str = ""
    hora_fin: str = ""
    tipo: str = "general"
    color: str = "#4f8ef7"
    todo_el_dia: bool = True
    imagen: str = ""

class EventoUpdate(EventoCreate):
    id: int

@router.get("/agenda/eventos")
def lista_eventos(mes: int = None, anio: int = None, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        if mes and anio:
            cur.execute("""
                SELECT id, titulo, descripcion, fecha_inicio, fecha_fin,
                       hora_inicio, hora_fin, tipo, color, todo_el_dia, imagen
                FROM eventos_agenda
                WHERE EXTRACT(MONTH FROM fecha_inicio) = %s
                  AND EXTRACT(YEAR FROM fecha_inicio) = %s
                ORDER BY fecha_inicio, hora_inicio
            """, (mes, anio))
        else:
            cur.execute("""
                SELECT id, titulo, descripcion, fecha_inicio, fecha_fin,
                       hora_inicio, hora_fin, tipo, color, todo_el_dia
                FROM eventos_agenda
                ORDER BY fecha_inicio DESC
            """)
        rows = cur.fetchall()
        cur.close()
        return {
            "eventos": [
                {
                    "id": r[0], "titulo": r[1], "descripcion": r[2] or "",
                    "fecha_inicio": str(r[3]), "fecha_fin": str(r[4]) if r[4] else "",
                    "hora_inicio": str(r[5]) if r[5] else "",
                    "hora_fin": str(r[6]) if r[6] else "",
                    "tipo": r[7], "color": r[8], "todo_el_dia": r[9],
                    "imagen": r[10] or ""
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.post("/agenda/crear")
def crear_evento(data: EventoCreate, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO eventos_agenda (titulo, descripcion, fecha_inicio, fecha_fin,
                hora_inicio, hora_fin, tipo, color, todo_el_dia, imagen)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.titulo, data.descripcion, data.fecha_inicio,
            data.fecha_fin or None, data.hora_inicio or None,
            data.hora_fin or None, data.tipo, data.color, data.todo_el_dia, data.imagen or None,
        ))
        eid = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return {"success": True, "id": eid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.put("/agenda/actualizar")
def actualizar_evento(data: EventoUpdate, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE eventos_agenda SET titulo=%s, descripcion=%s, fecha_inicio=%s,
                fecha_fin=%s, hora_inicio=%s, hora_fin=%s, tipo=%s, color=%s, todo_el_dia=%s, imagen=%s
            WHERE id=%s
        """, (
            data.titulo, data.descripcion, data.fecha_inicio,
            data.fecha_fin or None, data.hora_inicio or None,
            data.hora_fin or None, data.tipo, data.color, data.todo_el_dia, data.imagen or None, data.id
        ))
        conn.commit()
        cur.close()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.delete("/agenda/eliminar/{evento_id}")
def eliminar_evento(evento_id: int, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM eventos_agenda WHERE id = %s", (evento_id,))
        conn.commit()
        cur.close()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

# ── CUADRO DE NOTAS ───────────────────────────────────────────────────────────

class NotaCreate(BaseModel):
    estudiante_id: int
    materia_id: int
    anio: str = "2026"
    bimestre: int
    nota: float
    observacion: str = ""

class MateriaCreate(BaseModel):
    nombre: str
    grado: str = "General"

@router.get("/notas/materias")
def lista_materias(usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, grado FROM materias ORDER BY nombre")
        rows = cur.fetchall()
        cur.close()
        return {"materias": [{"id": r[0], "nombre": r[1], "grado": r[2]} for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.post("/notas/materias/crear")
def crear_materia(data: MateriaCreate, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO materias (nombre, grado) VALUES (%s, %s) RETURNING id",
                    (data.nombre, data.grado))
        mid = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return {"success": True, "id": mid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.delete("/notas/materias/eliminar/{materia_id}")
def eliminar_materia(materia_id: int, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM materias WHERE id = %s", (materia_id,))
        conn.commit()
        cur.close()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.get("/notas/cuadro")
def cuadro_notas(anio: str = "2026", materia_id: int = None, grado: str = None, seccion: str = None, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()

        # Obtener grados y secciones disponibles
        cur.execute("""
            SELECT DISTINCT grado, seccion FROM estudiantes
            WHERE grado IS NOT NULL
            ORDER BY grado, seccion
        """)
        grados_rows = cur.fetchall()

        # Cuadro de notas con filtros
        query = """
            SELECT e.id, e.nombre, e.grado, e.seccion,
                MAX(CASE WHEN n.bimestre = 1 THEN n.nota END) as b1,
                MAX(CASE WHEN n.bimestre = 2 THEN n.nota END) as b2,
                MAX(CASE WHEN n.bimestre = 3 THEN n.nota END) as b3,
                MAX(CASE WHEN n.bimestre = 4 THEN n.nota END) as b4,
                AVG(n.nota) as promedio
            FROM estudiantes e
            LEFT JOIN notas n ON n.estudiante_id = e.id
                AND n.anio = %s
                AND (%s::integer IS NULL OR n.materia_id = %s)
            WHERE 1=1
        """
        params = [anio, materia_id, materia_id]

        if grado:
            query += " AND e.grado = %s"
            params.append(grado)
        if seccion:
            query += " AND e.seccion = %s"
            params.append(seccion)

        query += " GROUP BY e.id, e.nombre, e.grado, e.seccion ORDER BY e.grado, e.seccion, e.nombre"

        cur.execute(query, params)
        rows = cur.fetchall()
        cur.close()

        return {
            "estudiantes": [
                {
                    "id": r[0], "nombre": r[1],
                    "grado": r[2] or "", "seccion": r[3] or "",
                    "b1": float(r[4]) if r[4] else None,
                    "b2": float(r[5]) if r[5] else None,
                    "b3": float(r[6]) if r[6] else None,
                    "b4": float(r[7]) if r[7] else None,
                    "promedio": round(float(r[8]), 1) if r[8] else None
                }
                for r in rows
            ],
            "grados": [{"grado": r[0], "seccion": r[1]} for r in grados_rows]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.post("/notas/guardar")
def guardar_nota(data: NotaCreate, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO notas (estudiante_id, materia_id, anio, bimestre, nota, observacion)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (estudiante_id, materia_id, anio, bimestre)
            DO UPDATE SET nota = EXCLUDED.nota, observacion = EXCLUDED.observacion
        """, (data.estudiante_id, data.materia_id, data.anio,
              data.bimestre, data.nota, data.observacion))
        conn.commit()
        cur.close()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)

@router.get("/notas/estudiante/{estudiante_id}")
def notas_estudiante(estudiante_id: int, anio: str = "2026", usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT m.id, m.nombre, m.grado,
                MAX(CASE WHEN n.bimestre = 1 THEN n.nota END) as b1,
                MAX(CASE WHEN n.bimestre = 2 THEN n.nota END) as b2,
                MAX(CASE WHEN n.bimestre = 3 THEN n.nota END) as b3,
                MAX(CASE WHEN n.bimestre = 4 THEN n.nota END) as b4,
                AVG(n.nota) as promedio
            FROM materias m
            LEFT JOIN notas n ON n.materia_id = m.id
                AND n.estudiante_id = %s AND n.anio = %s
            GROUP BY m.id, m.nombre, m.grado
            ORDER BY m.nombre
        """, (estudiante_id, anio))
        rows = cur.fetchall()
        cur.close()
        return {
            "notas": [
                {
                    "materia_id": r[0], "materia": r[1], "grado": r[2],
                    "b1": float(r[3]) if r[3] else None,
                    "b2": float(r[4]) if r[4] else None,
                    "b3": float(r[5]) if r[5] else None,
                    "b4": float(r[6]) if r[6] else None,
                    "promedio": round(float(r[7]), 1) if r[7] else None
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
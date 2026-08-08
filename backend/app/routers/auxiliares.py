from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import get_conn, put_conn
from app.auth import verificar_token, obtener_colegio_id
from app.utils import now_lima
from app.routers.estudiantes import IngresoRequest

router = APIRouter(prefix="/auxiliares", tags=["Auxiliares / Registro Administrativo"])


# ── Modelos ────────────────────────────────────────────────────────────────

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


# ── Registro Administrativo (CRUD) ──────────────────────────────────────────

@router.get("/lista")
def lista_auxiliares(busqueda: str = "", turno: str = "", cargo: str = "", usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        query = """
            SELECT id, nombres, apellidos, codigo, dni, fecha_nacimiento,
                   genero, telefono, email, direccion, area_asignada,
                   turno, fecha_ingreso, foto, cargo, codigo_barras
            FROM auxiliares
            WHERE colegio_id = %s
              AND (LOWER(nombres) LIKE %s OR LOWER(apellidos) LIKE %s
                   OR LOWER(codigo) LIKE %s OR dni LIKE %s)
        """
        params = [colegio_id] + [f"%{busqueda.lower()}%"] * 4
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


@router.post("/crear")
def crear_auxiliar(data: AuxiliarCreate, usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        prefijo = {"Docente": "DOC", "Auxiliar": "AUX", "Personal Administrativo": "PA"}.get(data.cargo, "AUX")
        cur.execute("SELECT COUNT(*) FROM auxiliares WHERE cargo = %s AND colegio_id = %s", (data.cargo, colegio_id))
        count = cur.fetchone()[0]
        codigo = f"{prefijo}{str(count + 1).zfill(5)}"

        import hashlib
        codigo_barras = hashlib.md5(f"{data.nombres} {data.apellidos} {codigo} {colegio_id}".encode()).hexdigest()

        cur.execute("""
            INSERT INTO auxiliares (nombres, apellidos, codigo, cargo, dni, fecha_nacimiento,
                genero, telefono, email, direccion, area_asignada, turno, fecha_ingreso, foto, codigo_barras, colegio_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, codigo
        """, (
            data.nombres, data.apellidos, codigo, data.cargo,
            data.dni or None, data.fecha_nacimiento or None,
            data.genero, data.telefono, data.email, data.direccion,
            data.area_asignada, data.turno,
            data.fecha_ingreso or None, data.foto, codigo_barras, colegio_id
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


@router.put("/actualizar")
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


@router.delete("/eliminar/{auxiliar_id}")
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


# ── Asistencia (por código de barras, tabla auxiliares_codigos) ────────────

@router.post("/ingreso")
def ingreso_auxiliar(data: IngresoRequest, usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre FROM auxiliares_codigos WHERE codigo_barras = %s AND colegio_id = %s", (data.codigo_barras, colegio_id))
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


@router.post("/salida")
def salida_auxiliar(data: IngresoRequest, usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre FROM auxiliares_codigos WHERE codigo_barras = %s AND colegio_id = %s", (data.codigo_barras, colegio_id))
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
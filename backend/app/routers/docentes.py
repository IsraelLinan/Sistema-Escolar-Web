from fastapi import APIRouter, HTTPException, Depends
from app.database import get_conn, put_conn
from app.auth import verificar_token
from app.utils import now_lima
from app.routers.estudiantes import IngresoRequest

router = APIRouter(prefix="/docentes", tags=["Docentes"])


@router.post("/ingreso")
def ingreso_docente(data: IngresoRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre FROM docentes WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        docente_id, nombre = row

        cur.execute("""
            SELECT id FROM ingresos_docentes
            WHERE docente_id = %s AND DATE(hora_ingreso) = %s
        """, (docente_id, now_lima().date()))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail=f"{nombre} ya registró su ingreso hoy")

        cur.execute("INSERT INTO ingresos_docentes (docente_id, hora_ingreso) VALUES (%s, %s)",
                    (docente_id, now_lima()))
        conn.commit()
        hora = now_lima().strftime('%H:%M:%S')
        cur.close()
        return {"success": True, "nombre": nombre, "hora": hora, "tipo": "ingreso"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.post("/salida")
def salida_docente(data: IngresoRequest, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre FROM docentes WHERE codigo_barras = %s", (data.codigo_barras,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Código no registrado en el sistema")
        docente_id, nombre = row

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
        hora = now_lima().strftime('%H:%M:%S')
        cur.close()
        return {"success": True, "nombre": nombre, "hora": hora, "tipo": "salida"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)
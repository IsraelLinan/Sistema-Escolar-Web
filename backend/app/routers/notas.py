from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import get_conn, put_conn
from app.auth import verificar_token, obtener_colegio_id

router = APIRouter(prefix="/notas", tags=["Cuadro de Notas"])


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


@router.get("/materias")
def lista_materias(usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, grado FROM materias WHERE colegio_id = %s ORDER BY nombre", (colegio_id,))
        rows = cur.fetchall()
        cur.close()
        return {"materias": [{"id": r[0], "nombre": r[1], "grado": r[2]} for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.post("/materias/crear")
def crear_materia(data: MateriaCreate, usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO materias (nombre, grado, colegio_id) VALUES (%s, %s, %s) RETURNING id",
                    (data.nombre, data.grado, colegio_id))
        mid = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return {"success": True, "id": mid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.delete("/materias/eliminar/{materia_id}")
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


@router.get("/cuadro")
def cuadro_notas(anio: str = "2026", materia_id: int = None, grado: str = None, seccion: str = None, usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute("""
            SELECT DISTINCT grado, seccion FROM estudiantes
            WHERE grado IS NOT NULL AND colegio_id = %s
            ORDER BY grado, seccion
        """, (colegio_id,))
        grados_rows = cur.fetchall()

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
            WHERE e.colegio_id = %s
        """
        params = [anio, materia_id, materia_id, colegio_id]

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


@router.post("/guardar")
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


@router.get("/estudiante/{estudiante_id}")
def notas_estudiante(estudiante_id: int, anio: str = "2026", usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
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
            WHERE m.colegio_id = %s
            GROUP BY m.id, m.nombre, m.grado
            ORDER BY m.nombre
        """, (estudiante_id, anio, colegio_id))
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
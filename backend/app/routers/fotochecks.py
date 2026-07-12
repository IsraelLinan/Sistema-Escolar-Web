from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import get_conn, put_conn
from app.auth import verificar_token

router = APIRouter(prefix="/fotochecks", tags=["Fotochecks / Carnets"])


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


@router.post("/guardar")
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

        # Para Auxiliar no hay FK dedicada en fotochecks; se guarda solo por nombre

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


@router.get("/lista")
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


@router.delete("/eliminar/{fotocheck_id}")
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
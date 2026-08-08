from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import get_conn, put_conn
from app.auth import verificar_token, obtener_colegio_id

router = APIRouter(prefix="/agenda", tags=["Agenda Escolar"])


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


@router.get("/eventos")
def lista_eventos(mes: int = None, anio: int = None, usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
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
                  AND colegio_id = %s
                ORDER BY fecha_inicio, hora_inicio
            """, (mes, anio, colegio_id))
        else:
            cur.execute("""
                SELECT id, titulo, descripcion, fecha_inicio, fecha_fin,
                       hora_inicio, hora_fin, tipo, color, todo_el_dia, imagen
                FROM eventos_agenda
                WHERE colegio_id = %s
                ORDER BY fecha_inicio DESC
            """, (colegio_id,))
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


@router.post("/crear")
def crear_evento(data: EventoCreate, usuario: str = Depends(verificar_token), colegio_id: int = Depends(obtener_colegio_id)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO eventos_agenda (titulo, descripcion, fecha_inicio, fecha_fin,
                hora_inicio, hora_fin, tipo, color, todo_el_dia, imagen, colegio_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.titulo, data.descripcion, data.fecha_inicio,
            data.fecha_fin or None, data.hora_inicio or None,
            data.hora_fin or None, data.tipo, data.color, data.todo_el_dia,
            data.imagen or None, colegio_id
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


@router.put("/actualizar")
def actualizar_evento(data: EventoUpdate, usuario: str = Depends(verificar_token)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE eventos_agenda SET titulo=%s, descripcion=%s, fecha_inicio=%s,
                fecha_fin=%s, hora_inicio=%s, hora_fin=%s, tipo=%s, color=%s,
                todo_el_dia=%s, imagen=%s
            WHERE id=%s
        """, (
            data.titulo, data.descripcion, data.fecha_inicio,
            data.fecha_fin or None, data.hora_inicio or None,
            data.hora_fin or None, data.tipo, data.color, data.todo_el_dia,
            data.imagen or None, data.id
        ))
        conn.commit()
        cur.close()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        put_conn(conn)


@router.delete("/eliminar/{evento_id}")
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
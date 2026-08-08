import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, Header
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
EXPIRE_HOURS = 12

def crear_token(username: str, colegio_id: int) -> str:
    expira = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    payload = {"sub": username, "colegio_id": colegio_id, "exp": expira}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(authorization: str = Header(None)):
    """Devuelve el username (compatibilidad con endpoints existentes)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def obtener_colegio_id(authorization: str = Header(None)) -> int:
    """Devuelve el colegio_id del usuario autenticado, para filtrar datos por colegio."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        colegio_id = payload.get("colegio_id")
        if colegio_id is None:
            raise HTTPException(status_code=401, detail="Token sin colegio asociado, vuelve a iniciar sesión")
        return colegio_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
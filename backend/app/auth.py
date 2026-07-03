import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, Header
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
EXPIRE_HOURS = 12

def crear_token(username: str) -> str:
    expira = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    payload = {"sub": username, "exp": expira}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

async def enviar_notificacion(chat_id: str, mensaje: str):
    """Envía un mensaje de Telegram al apoderado."""
    if not chat_id or not TELEGRAM_TOKEN:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": mensaje,
                    "parse_mode": "HTML"
                },
                timeout=10
            )
    except Exception as e:
        print(f"Error al enviar notificación Telegram: {e}")

def construir_mensaje_ingreso(nombre: str, hora: str, tipo: str) -> str:
    emoji = "🎓" if tipo == "estudiante" else "👨‍🏫"
    return (
        f"{emoji} <b>INGRESO REGISTRADO</b>\n\n"
        f"👤 <b>Nombre:</b> {nombre}\n"
        f"🕐 <b>Hora de ingreso:</b> {hora}\n"
        f"📅 <b>Estado:</b> ✅ Llegó al colegio\n\n"
        f"<i>Sistema de Gestión Escolar</i>"
    )

def construir_mensaje_salida(nombre: str, hora: str, tipo: str) -> str:
    emoji = "🎓" if tipo == "estudiante" else "👨‍🏫"
    return (
        f"{emoji} <b>SALIDA REGISTRADA</b>\n\n"
        f"👤 <b>Nombre:</b> {nombre}\n"
        f"🕐 <b>Hora de salida:</b> {hora}\n"
        f"📅 <b>Estado:</b> 🏠 Salió del colegio\n\n"
        f"<i>Sistema de Gestión Escolar</i>"
    )
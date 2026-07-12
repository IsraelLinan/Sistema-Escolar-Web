from datetime import datetime
import pytz

LIMA_TZ = pytz.timezone('America/Lima')

def now_lima():
    """Devuelve la hora actual en la zona horaria de Lima, sin tzinfo (naive)."""
    return datetime.now(LIMA_TZ).replace(tzinfo=None)
import psycopg2
from psycopg2 import pool
import os

# Configuración de la base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'dbname': os.getenv('DB_NAME', 'colegio'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '123456'),
}

# Paleta de colores centralizada para toda la app
COLORS = {
    "bg":           "#0f1117",   # Fondo principal (casi negro)
    "bg2":          "#1a1d27",   # Fondo secundario (paneles)
    "bg3":          "#22263a",   # Fondo terciario (inputs, hover)
    "accent":       "#4f8ef7",   # Azul principal
    "accent_hover": "#3a7ae0",   # Azul hover
    "success":      "#22c55e",   # Verde
    "danger":       "#ef4444",   # Rojo
    "warning":      "#f59e0b",   # Amarillo
    "text":         "#e2e8f0",   # Texto principal
    "text_muted":   "#94a3b8",   # Texto secundario
    "border":       "#2e3350",   # Bordes
}

FONTS = {
    "title":    ("Segoe UI", 22, "bold"),
    "subtitle": ("Segoe UI", 13, "bold"),
    "body":     ("Segoe UI", 11),
    "small":    ("Segoe UI", 9),
    "mono":     ("Consolas", 11),
}

# Crear el pool de conexiones
class DBPool:
    def __init__(self, minconn, maxconn):
        self.pool = psycopg2.pool.SimpleConnectionPool(
            minconn,
            maxconn,
            **DB_CONFIG
        )

    def get_conn(self):
        return self.pool.getconn()

    def put_conn(self, conn):
        self.pool.putconn(conn)

    def close_all(self):
        self.pool.closeall()

# Instancia global del pool
db_pool = DBPool(minconn=1, maxconn=10)


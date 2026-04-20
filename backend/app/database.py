import psycopg2
from psycopg2.pool import SimpleConnectionPool
import os

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'dbname': os.getenv('DB_NAME', 'colegio'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '123456'),
    'port': os.getenv('DB_PORT', '5432'),
}

db_pool = SimpleConnectionPool(minconn=1, maxconn=10, **DB_CONFIG)

def get_conn():
    return db_pool.getconn()

def put_conn(conn):
    db_pool.putconn(conn)
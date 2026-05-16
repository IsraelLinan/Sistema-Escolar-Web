# 📦 Guía de Instalación — Sistema de Gestión Escolar

## ✅ Prerrequisitos

### Mac
- Homebrew → `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Python 3 → `brew install python@3.11`
- Node.js → `brew install node`
- Docker Desktop → https://www.docker.com/products/docker-desktop

### Windows
- Python 3 → https://www.python.org/downloads
- Node.js → https://nodejs.org
- Docker Desktop → https://www.docker.com/products/docker-desktop

---

## 🚀 Instalación paso a paso

### PASO 1 — Clonar el proyecto
```bash
cd ~/Desktop
git clone https://github.com/IsraelLinan/Sistema-Escolar-Web.git
cd Sistema-Escolar-Web
```

### PASO 2 — Crear la base de datos en Docker
```bash
docker run -d \
  --name colegio-db \
  -e POSTGRES_DB=colegio \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=123456 \
  -p 5432:5432 \
  postgres:15
```

### PASO 3 — Cargar la base de datos
Copia el archivo `colegio_backup.sql` a la nueva PC y ejecuta:
```bash
docker exec -i colegio-db psql -U postgres -d colegio < colegio_backup.sql
```

### PASO 4 — Instalar dependencias del backend
```bash
cd ~/Desktop/Sistema-Escolar-Web/backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn psycopg2-binary python-barcode pillow reportlab httpx python-dotenv pytz openpyxl
```

### PASO 5 — Crear archivo .env
```bash
echo "TELEGRAM_BOT_TOKEN=tu_token_aqui" > ~/Desktop/Sistema-Escolar-Web/backend/.env
```
> ⚠️ Reemplaza `tu_token_aqui` con el token real de tu bot de Telegram.

### PASO 6 — Instalar dependencias del frontend
```bash
cd ~/Desktop/Sistema-Escolar-Web/frontend
npm install
```

### PASO 7 — Dar permisos y ejecutar
```bash
chmod +x ~/Desktop/Sistema-Escolar-Web/iniciar.sh
chmod +x ~/Desktop/Sistema-Escolar-Web/detener.sh
~/Desktop/Sistema-Escolar-Web/iniciar.sh
```

---

## 🔄 Uso diario

### Iniciar el sistema
```bash
~/Desktop/Sistema-Escolar-Web/iniciar.sh
```

### Detener el sistema
```bash
~/Desktop/Sistema-Escolar-Web/detener.sh
```

---

## 📋 Módulos disponibles

| Módulo | Descripción |
|---|---|
| 🎓 Asistencia de Estudiantes | Registro de ingreso y salida mediante código de barras |
| 👨‍🏫 Asistencia de Docentes | Registro de ingreso y salida mediante código de barras |
| 📋 Reporte de Asistencia | Consulta registros filtrados por fecha, tipo y nombre |
| 🏷️ Generar Código de Barra | Registra y genera códigos para estudiantes y docentes |
| 🪪 Generar Fotocheck Escolar | Diseña e imprime carnés escolares en PDF |
| 👨‍👩‍👧 Gestión de Apoderados | Configura Telegram de apoderados para notificaciones |
| 📊 Dashboard Web | Visualiza estadísticas en tiempo real (Streamlit) |

---

## 🌐 URLs del sistema

| Servicio | URL |
|---|---|
| Sistema principal | http://localhost:3000 |
| API Backend | http://localhost:8000 |
| Documentación API | http://localhost:8000/docs |
| Dashboard Streamlit | http://localhost:8501 |

---

## 🤖 Credenciales por defecto

| Campo | Valor |
|---|---|
| Usuario | admin |
| Contraseña | 123456 |

---

## ❓ Solución de problemas

| Error | Solución |
|---|---|
| Puerto 5432 ocupado | `sudo kill -9 $(sudo lsof -ti :5432)` |
| Docker no inicia | Abre Docker Desktop manualmente y espera la ballena 🐳 |
| Frontend no carga | Ejecuta `cd frontend && npm install` |
| Backend no conecta | Verifica que `colegio-db` esté corriendo con `docker ps` |
#!/bin/bash

# ── Colores para mensajes ─────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "🏫 =================================================="
echo "   SISTEMA DE GESTIÓN ESCOLAR"
echo "   Iniciando todos los servicios..."
echo "=================================================="
echo ""

# ── 1. Iniciar Docker Desktop ─────────────────────────────────────────────────
echo -e "${YELLOW}▶ Iniciando Docker Desktop...${NC}"
open -a Docker
echo "  Esperando que Docker esté listo..."
sleep 8

# Esperar hasta que Docker esté corriendo
until docker info > /dev/null 2>&1; do
  echo "  Docker aún no está listo, esperando..."
  sleep 3
done
echo -e "${GREEN}  ✔ Docker listo${NC}"

# ── 2. Iniciar base de datos ──────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Iniciando base de datos...${NC}"
docker start colegio-db
sleep 3
echo -e "${GREEN}  ✔ Base de datos lista${NC}"

# ── 3. Iniciar backend ────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Iniciando backend FastAPI...${NC}"
cd ~/Desktop/Sistema-Escolar-Web/backend
source venv/bin/activate
uvicorn app.main:app --port 8000 &
BACKEND_PID=$!
sleep 4
echo -e "${GREEN}  ✔ Backend listo en http://localhost:8000${NC}"

# ── 4. Iniciar frontend ───────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Iniciando frontend React...${NC}"
cd ~/Desktop/Sistema-Escolar-Web/frontend
BROWSER=none npm start &
FRONTEND_PID=$!
sleep 10
echo -e "${GREEN}  ✔ Frontend listo en http://localhost:3000${NC}"

# ── 5. Iniciar Dashboard Streamlit ───────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Iniciando Dashboard Streamlit...${NC}"
cd ~/Desktop/Sistema-Escolar-Web
source backend/venv/bin/activate
streamlit run dashboard.py --server.port 8501 &
STREAMLIT_PID=$!
sleep 5
echo -e "${GREEN}  ✔ Dashboard listo en http://localhost:8501${NC}"

# ── 5. Abrir navegador ────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Abriendo el sistema en el navegador...${NC}"
sleep 4
open http://localhost:3000

echo ""
echo -e "${GREEN}=================================================="
echo "  ✔ SISTEMA INICIADO CORRECTAMENTE"
echo "  📌 URL: http://localhost:3000"
echo "  📌 API: http://localhost:8000"
echo "=================================================="${NC}
echo ""
echo "  Presiona CTRL+C para detener todos los servicios."
echo ""

# Esperar y manejar cierre
trap "echo ''; echo '🛑 Cerrando servicios...'; kill $BACKEND_PID $FRONTEND_PID $STREAMLIT_PID 2>/dev/null; docker stop colegio-db; echo '✔ Sistema detenido.'; exit" INT
wait
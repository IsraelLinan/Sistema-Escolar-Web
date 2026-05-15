#!/bin/bash
echo ""
echo "🛑 Deteniendo Sistema de Gestión Escolar..."

# Detener backend
pkill -f "uvicorn app.main:app" 2>/dev/null
echo "  ✔ Backend detenido"

# Detener frontend
pkill -f "react-scripts start" 2>/dev/null
echo "  ✔ Frontend detenido"

# Detener base de datos
docker stop colegio-db 2>/dev/null
echo "  ✔ Base de datos detenida"

echo ""
echo "✔ Sistema detenido correctamente."
echo ""
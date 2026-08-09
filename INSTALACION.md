# 📦 Guía de Instalación — Sistema de Gestión Escolar (Multi-Colegio)

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
Copia el archivo `colegio_backup.sql` (exportado desde tu instalación actual) a la nueva PC y ejecuta:
```bash
docker exec -i colegio-db psql -U postgres -d colegio < colegio_backup.sql
```

> 💡 Para generar ese respaldo desde una instalación existente:
> ```bash
> docker exec -t colegio-db pg_dump -U postgres colegio > colegio_backup.sql
> ```

### PASO 4 — Instalar dependencias del backend
```bash
cd ~/Desktop/Sistema-Escolar-Web/backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn psycopg2-binary python-barcode pillow reportlab \
            httpx python-dotenv pytz openpyxl bcrypt "python-jose[cryptography]" \
            streamlit pandas plotly
```

### PASO 5 — Crear archivo `.env`
```bash
touch ~/Desktop/Sistema-Escolar-Web/backend/.env
```
Pega dentro (reemplazando por tus valores reales):
```
TELEGRAM_BOT_TOKEN=tu_token_de_telegram_aqui
SECRET_KEY=una_clave_larga_y_aleatoria_para_firmar_los_jwt
```
> ⚠️ Genera una `SECRET_KEY` segura con:
> ```bash
> python3 -c "import secrets; print(secrets.token_hex(32))"
> ```
> Este archivo **nunca** debe subirse a GitHub (ya está excluido en `.gitignore`).

### PASO 6 — Instalar dependencias del frontend
```bash
cd ~/Desktop/Sistema-Escolar-Web/frontend
npm install
```

### PASO 7 — (Opcional) Configurar tema del Dashboard
El Dashboard usa modo claro fijo. Si quieres personalizarlo, revisa:
```bash
~/Desktop/Sistema-Escolar-Web/.streamlit/config.toml
```

### PASO 8 — Dar permisos y ejecutar
```bash
chmod +x ~/Desktop/Sistema-Escolar-Web/iniciar.sh
chmod +x ~/Desktop/Sistema-Escolar-Web/detener.sh
~/Desktop/Sistema-Escolar-Web/iniciar.sh
```

---

## 🔄 Uso diario

### Iniciar el sistema (todo junto: BD + Backend + Frontend + Dashboard)
```bash
~/Desktop/Sistema-Escolar-Web/iniciar.sh
```

### Detener el sistema
```bash
~/Desktop/Sistema-Escolar-Web/detener.sh
```

### Si el puerto 5432 está ocupado por un PostgreSQL local
```bash
sudo kill -9 $(sudo lsof -ti :5432)
```

---

## 🏫 Sistema Multi-Colegio

El sistema soporta múltiples colegios operando sobre la misma instalación, cada uno con sus datos completamente aislados (estudiantes, docentes, auxiliares, notas, eventos, carnés, etc.).

### Roles de usuario

| Rol | Alcance |
|---|---|
| `super_admin` | Solo puede acceder a **Gestión de Colegios**. No ve datos de ningún colegio en particular. |
| `admin` (por defecto) | Usuario normal de un colegio específico. Ve únicamente los datos de su propio colegio. |

### Cómo agregar un nuevo colegio

**1. Inicia sesión como `super_admin`** y ve al módulo **Gestión de Colegios** → **+ Nuevo Colegio**. Completa nombre, código único y logo (opcional).

**2. Genera el hash de la contraseña** para el primer usuario administrador de ese colegio:
```bash
python3 -c "import bcrypt; print(bcrypt.hashpw(b'contraseña_sin_enye_ni_tildes', bcrypt.gensalt()).decode())"
```
> ⚠️ Usa solo letras, números y símbolos simples en la contraseña de este comando — evita `ñ` y tildes, ya que rompen la codificación en la Terminal.

**3. Verifica el `id` del colegio recién creado:**
```bash
docker exec -it colegio-db psql -U postgres -d colegio -c "SELECT id, nombre FROM colegios ORDER BY id DESC LIMIT 1;"
```

**4. Crea el usuario administrador de ese colegio**, reemplazando `X` por el `id` obtenido y el hash por el que generaste en el paso 2:
```bash
docker exec -it colegio-db psql -U postgres -d colegio -c "
INSERT INTO usuarios (username, password, colegio_id, rol)
VALUES ('nombre_usuario', '\$2b\$12\$...(hash completo)...', X, 'admin');"
```
> ⚠️ **Muy importante:** cada símbolo `$` del hash debe ir escapado con una barra invertida (`\$`), o la Terminal lo interpretará como una variable y el hash quedará corrupto. Verifica siempre después con:
> ```bash
> docker exec -it colegio-db psql -U postgres -d colegio -c "SELECT username, password FROM usuarios WHERE username = 'nombre_usuario';"
> ```
> El resultado debe empezar exactamente con `$2b$12$...`.

**5. Prueba el login** con ese usuario — debería ver el sidebar completo del sistema, con todos los módulos vacíos (colegio nuevo, sin datos aún).

### Convertir un usuario existente en `super_admin`
```bash
docker exec -it colegio-db psql -U postgres -d colegio -c "
UPDATE usuarios SET rol = 'super_admin' WHERE username = 'nombre_usuario';"
```
> ⚠️ Un `super_admin` pierde acceso a los módulos normales del colegio (asistencia, notas, etc.) — solo puede administrar colegios. Si quieres seguir gestionando tu colegio original además de crear otros nuevos, mantén un usuario `admin` separado para eso (ver el flujo del paso anterior).

---

## 📋 Módulos disponibles

### 🗓️ Asistencia
| Módulo | Descripción |
|---|---|
| 🎓 Asistencia de Estudiantes | Registro de ingreso y salida mediante código de barras (1 vez al día) |
| 👨‍🏫 Asistencia de Docentes | Registro de ingreso y salida mediante código de barras (1 vez al día) |
| 👷 Asistencia de Auxiliares | Registro de ingreso y salida mediante código de barras (1 vez al día) |
| 📋 Reporte de Asistencia | Consulta registros filtrados por fecha, tipo (Estudiante/Docente/Auxiliar) y nombre, con paginación |

### 🗂️ Gestión General
| Módulo | Descripción |
|---|---|
| 🗂️ Registro Administrativo | Gestiona Docentes, Auxiliares y Personal Administrativo (cargo, datos personales, laborales y foto), filtrable por cargo |
| 🏷️ Generar Código de Barra | Genera códigos para Estudiante, Docente o Auxiliar, con detección de duplicados |
| 🪪 Generar Fotocheck | Módulo unificado: selecciona Estudiante / Docente / Auxiliar y genera su carné con colores distintos (azul / verde / rojo) |
| 🖼️ Carnets | Consulta, filtra (por pestañas Estudiante/Docente/Auxiliar), selecciona e imprime en PDF los carnés guardados, con paginación |
| 👨‍👩‍👧 Gestión de Apoderados | Configura el Chat ID de Telegram de cada apoderado para recibir notificaciones |

### 🎓 Académico
| Módulo | Descripción |
|---|---|
| 📅 Agenda Escolar | Calendario mensual con eventos (exámenes, reuniones, feriados, actividades, entregas), con imagen adjunta opcional |
| 📊 Cuadro de Notas | Registro de notas por materia y bimestre (B1–B4), filtrable por grado y sección, con promedio y estado (aprobado/desaprobado) |

### 🛠️ Herramientas
| Módulo | Descripción |
|---|---|
| 📊 Dashboard Web | Estadísticas en tiempo real (Streamlit, modo claro): totales por tipo de personal, gráfico de barras, gráfico de pastel y tendencia semanal (lunes a viernes) |

### ⚙️ Sistema
| Función | Descripción |
|---|---|
| 🌙/☀️ Modo Claro / Oscuro | Toggle disponible en la barra lateral |
| 🔐 Cambiar Contraseña | Disponible desde el sidebar, con validación de fortaleza |
| 🏫 Gestión de Colegios | Solo visible para `super_admin`: crear, listar, activar/desactivar colegios |

---

## 🌐 URLs del sistema

| Servicio | URL |
|---|---|
| Sistema principal | http://localhost:3000 |
| API Backend | http://localhost:8000 |
| Documentación interactiva de la API | http://localhost:8000/docs |
| Dashboard Streamlit | http://localhost:8501 |

---

## 🤖 Bot de Telegram — Notificaciones a Apoderados

1. En Telegram, busca `@BotFather` y crea un bot con `/newbot`.
2. Copia el token que te entrega y colócalo en `backend/.env` como `TELEGRAM_BOT_TOKEN`.
3. El apoderado debe iniciar conversación con el bot y escribir `/start`.
4. Obtén su Chat ID visitando en el navegador:
   ```
   https://api.telegram.org/bot<TU_TOKEN>/getUpdates
   ```
5. Regístralo en el módulo **Gestión de Apoderados** dentro del sistema.

Cada vez que un estudiante registre ingreso o salida, su apoderado recibirá una notificación automática.

---

## 🔐 Seguridad implementada

- Contraseñas de usuarios almacenadas con **bcrypt** (hash irreversible).
- Sesiones mediante **JWT**, con expiración de 12 horas, incluyendo `colegio_id` y `rol`.
- Todas las rutas sensibles de la API requieren token válido (`Authorization: Bearer <token>`).
- Aislamiento de datos por colegio: cada consulta filtra automáticamente por el `colegio_id` del usuario autenticado.
- Rutas de **Gestión de Colegios** protegidas exclusivamente para `super_admin`.
- El archivo `.env` (tokens y claves) está excluido del control de versiones.
- Validación de duplicados al generar códigos de barra.
- Restricción de un solo registro de ingreso/salida por día por persona.

---

## 🏗️ Arquitectura del backend

El backend está organizado en routers por dominio (no todo en un solo archivo):

```
backend/app/
  main.py              → arma la app FastAPI e incluye todos los routers
  auth.py              → creación/verificación de JWT, verificación de rol super_admin
  database.py          → pool de conexión a PostgreSQL
  telegram_bot.py       → envío de notificaciones
  utils.py             → utilidades comunes (zona horaria Lima)
  routers/
    auth.py             → login, cambiar contraseña, datos del colegio propio
    estudiantes.py       → asistencia de estudiantes (filtrado por colegio)
    docentes.py          → asistencia de docentes (filtrado por colegio)
    auxiliares.py        → Registro Administrativo + asistencia de auxiliares (filtrado por colegio)
    codigos.py           → generador de códigos de barra (filtrado por colegio)
    apoderados.py        → gestión de apoderados y notificaciones (filtrado por colegio)
    fotochecks.py        → guardar y listar carnés / Carnets (filtrado por colegio)
    reportes.py          → reporte de asistencia, exportar Excel/PDF (filtrado por colegio)
    agenda.py            → agenda escolar (filtrado por colegio)
    notas.py             → cuadro de notas y materias (filtrado por colegio)
    colegios.py          → CRUD de colegios (solo super_admin)
```

### Modelo de datos multi-colegio

```
colegios
  id, nombre, codigo (único), logo, activo

usuarios
  id, username, password (hash), colegio_id → colegios.id, rol ('admin' | 'super_admin')

estudiantes, docentes, auxiliares, auxiliares_codigos,
eventos_agenda, materias, fotochecks
  ... colegio_id → colegios.id
```

> Las tablas `ingresos_estudiantes`, `ingresos_docentes`, `ingresos_auxiliares`, `notas` y `personas` no requieren `colegio_id` propio: heredan el aislamiento a través de su relación con `estudiante_id` / `docente_id` / `auxiliar_id` / `materia_id`, que ya pertenecen a un colegio específico.

---

## 🎨 Arquitectura del frontend

```
frontend/src/
  config.js                    → URL centralizada del backend (API_URL)
  hooks/
    useTheme.js                 → modo claro/oscuro
    useImageUpload.js           → carga de imágenes a base64
  components/
    common/
      ConfirmDeleteModal.jsx    → modal reutilizable de confirmación
      Paginacion.jsx            → controles de paginación reutilizables
    StudentIngress.jsx
    TeacherIngress.jsx
    AuxiliarIngress.jsx
    AuxiliaresModule.jsx        → Registro Administrativo
    BarcodeGenerator.jsx
    FotocheckGenerator.jsx      → Generar Fotocheck (unificado: Estudiante/Docente/Auxiliar)
    CarnetsModule.jsx
    WeeklyReports.jsx           → Reporte de Asistencia
    ApoderadosManager.jsx
    AgendaEscolar.jsx
    CuadroNotas.jsx
    CambiarPassword.jsx
    ThemeToggle.jsx
    GestionColegios.jsx         → solo super_admin
  pages/
    Login.jsx                   → guarda token, colegio_nombre, colegio_logo y rol
    Dashboard.jsx                → sidebar condicional según rol
```

---

## ❓ Solución de problemas

| Error | Solución |
|---|---|
| Puerto 5432 ocupado | `sudo kill -9 $(sudo lsof -ti :5432)` |
| Docker no inicia | Abre Docker Desktop manualmente y espera la ballena 🐳 |
| Frontend no carga | Ejecuta `cd frontend && npm install` |
| Backend no conecta a la BD | Verifica que `colegio-db` esté corriendo con `docker ps` |
| Dashboard no cambia de tema | Verifica `.streamlit/config.toml` y relanza con `streamlit run dashboard.py` desde la raíz del proyecto |
| Notificación de Telegram no llega | Verifica que el apoderado escribió `/start` al bot y que su Chat ID esté bien registrado |
| Error 401 al usar la API | El token JWT expiró (dura 12h); vuelve a iniciar sesión |
| No puedo entrar a un colegio con mi usuario de siempre | Verifica que ese usuario no fue convertido a `super_admin`; si lo fue, crea un usuario `admin` separado para ese colegio |
| Un usuario nuevo no puede iniciar sesión tras crearlo por Terminal | El hash de la contraseña probablemente quedó corrupto por no escapar los `$`; verifica con `SELECT password FROM usuarios WHERE username = '...'` que empiece con `$2b$12$` completo |

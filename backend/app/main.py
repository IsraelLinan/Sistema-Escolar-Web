from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    estudiantes,
    docentes,
    auxiliares,
    codigos,
    apoderados,
    fotochecks,
    reportes,
    agenda,
    notas,
    colegios,
)

app = FastAPI(title="Sistema Escolar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(estudiantes.router)
app.include_router(docentes.router)
app.include_router(auxiliares.router)
app.include_router(codigos.router)
app.include_router(apoderados.router)
app.include_router(fotochecks.router)
app.include_router(reportes.router)
app.include_router(agenda.router)
app.include_router(notas.router)
app.include_router(colegios.router)


@app.get("/")
def root():
    return {"message": "Sistema Escolar API corriendo"}
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.dashboard import router as dashboard_router
from api.advance import router as advance_router
from api.settlement import router as settlement_router
from api.employee import router as employee_router
from api.gl_account import router as gl_router
from api.upload import router as upload_router
from api.reminder import router as reminder_router
from api.export import router as export_router
from scheduler.reminder_scheduler import (
    start_reminder_scheduler,
    stop_reminder_scheduler
)

app = FastAPI(
    title="REFCON API",
    description="Refcon Petty Cash Monitoring System",
    version="1.0.0"
)

from database.connection import Base, engine
from database import models
Base.metadata.create_all(bind=engine)

# =========================================================
# CORS - Izinkan React (frontend) mengakses API ini
# Di production, ganti "*" dengan domain spesifik
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    from database.connection import SessionLocal
    start_reminder_scheduler(SessionLocal)


@app.on_event("shutdown")
def shutdown_event():
    stop_reminder_scheduler()


@app.get("/", tags=["Root"])
def root():
    return {
        "application": "REFCON API",
        "status": "Running",
        "version": "1.0.0"
    }

app.include_router(dashboard_router)
app.include_router(advance_router)
app.include_router(settlement_router)
app.include_router(employee_router)
app.include_router(gl_router)
app.include_router(upload_router)
app.include_router(reminder_router)
app.include_router(export_router)
# app.include_router(dashboard_advance.router)
# app.include_router(dashboard_settlement.router)
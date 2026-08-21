import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load Environment Variables (.env)
load_dotenv()

# Import Routers
from api.dashboard import router as dashboard_router
from api.advance import router as advance_router
from api.settlement import router as settlement_router
from api.employee import router as employee_router
from api.gl_account import router as gl_router
from api.cost_center import router as cost_center_router
from api.vendor import router as vendor_router
from api.check import router as check_router
from api.upload import router as upload_router
from api.reminder import router as reminder_router
from api.export import router as export_router
from api.cash_opname import router as cash_opname_router

# Import Scheduler & DB Connection
from scheduler.reminder_scheduler import (
    startup_reminder,
    start_reminder_scheduler,
    stop_reminder_scheduler
)
from database.connection import Base, engine, SessionLocal
from database import models

# Inisialisasi Tabel DB
Base.metadata.create_all(bind=engine)


# Lifespan Event Handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    startup_reminder(SessionLocal)
    start_reminder_scheduler(SessionLocal)
    
    yield

    stop_reminder_scheduler()


# Inisialisasi FastAPI App
app = FastAPI(
    title="REFCON API",
    description="Refcon Petty Cash Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Memungkinkan akses dari porting Apache24
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Endpoint
@app.get("/", tags=["Root"])
def root():
    return {
        "application": "REFCON API",
        "status": "Running",
        "version": "1.0.0"
    }

# Include Router 
app.include_router(dashboard_router)
app.include_router(advance_router)
app.include_router(settlement_router)
app.include_router(employee_router)
app.include_router(gl_router)
app.include_router(cost_center_router)
app.include_router(vendor_router)
app.include_router(check_router)
app.include_router(upload_router)
app.include_router(reminder_router)
app.include_router(export_router)
app.include_router(cash_opname_router)

# Runner Dinamis untuk Porting 
if __name__ == "__main__":
    APP_HOST = os.getenv("APP_HOST", "0.0.0.0") 
    APP_PORT = int(os.getenv("APP_PORT", 8000)) 
    uvicorn.run("main:app", host=APP_HOST, port=APP_PORT, reload=False)
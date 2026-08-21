import os
import shutil
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Transaction
from etl.pipeline import run_pipeline
from etl.gl_loader import load_gl
from etl.utils.gl_column_mapper import map_columns as map_gl_columns
from etl.employee_loader import load_employee
from etl.utils.employee_mapper import map_columns as map_employee_columns
from api.dashboard import DashboardSource

router = APIRouter(
    tags=["Upload & Ingestion"]
)
UPLOAD_DIR = "uploads"

# IMPORT SAP (Transactions)
@router.post("/dashboard/import-sap")
async def import_sap(
    source: DashboardSource = DashboardSource.rungkut,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="File harus berupa Excel (.xlsx/.xls)"
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        result = run_pipeline(
            file_path=file_path,
            db=db,
            source=source
        )

        if result.get("message") == "ETL failed":
            raise HTTPException(
                status_code=500,
                detail=result.get("error")
            )

        return {
            "message": "Import SAP berhasil",
            "filename": file.filename,
            "rows": result.get("rows"),
            "inserted": result.get("inserted"),
            "skipped": result.get("skipped")
        }

    finally:
        # Hapus file setelah selesai diproses
        if os.path.exists(file_path):
            os.remove(file_path)


# UPLOAD GL ACCOUNT
@router.post("/gl-account/upload")
def upload_gl_account(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    try:
        if not file.filename.endswith((".xlsx", ".xls")):
            raise HTTPException(
                status_code=400,
                detail="File harus berupa Excel (.xlsx/.xls)"
            )

        df = pd.read_excel(file.file)

        df = map_gl_columns(df)

        required = [
            "gl_account",
            "nama_gl_account"
        ]

        missing = [
            col
            for col in required
            if col not in df.columns
        ]

        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Kolom tidak ditemukan: {missing}"
            )
        
        from etl.utils.normalizer import (normalize_code)
        df = df[required]
        df["gl_account"] = (
            df["gl_account"]
            .apply(normalize_code)
        )
        df = df.dropna(subset=["gl_account"])
        df = df.drop_duplicates(
            subset=["gl_account"], keep="last"
        )

        result = load_gl(df, db)

        return {
            "message": "Upload Success",
            "total": result["total"],
            "inserted": result["inserted"],
            "updated": result["updated"],
            "unchanged": result["unchanged"]
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# IMPORT EMPLOYEE
@router.post("/employee/import")
async def import_employee(

    file: UploadFile = File(...),
    db: Session = Depends(get_db)

):

    # Validasi file
    if not file.filename.endswith((".xlsx", ".xls")):

        raise HTTPException(
            status_code=400,
            detail="File harus berupa Excel."
        )

    try:

        # Read excel
        df = pd.read_excel(file.file)

        if df.empty:

            raise HTTPException(
                status_code=400,
                detail="File Excel kosong."
            )

        # Mapping kolom
        df = map_employee_columns(df)

        # Load ke database
        result = load_employee(df, db)

        return {

            "message": "Import Employee berhasil.",
            "filename": file.filename,
            **result

        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(

            status_code=500,
            detail=f"Gagal import Employee : {str(e)}"

        )
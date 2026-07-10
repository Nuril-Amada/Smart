import os
import shutil
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database.connection import get_db
from etl.pipeline import run_pipeline
from etl.gl_loader import load_gl
from etl.utils.gl_column_mapper import map_columns
from database.models import (
    Settlement,
    SettlementSource,
    Employee
)
from database.models import Transaction


router = APIRouter(
    tags=["Upload & Ingestion"]
)

UPLOAD_DIR = "uploads"

# IMPORT SAP (Transactions)

@router.post("/dashboard/import-sap")
async def import_sap(
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
            file_path,
            db
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

        df = map_columns(df)

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

        df = df[required]

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

# UPLOAD REIMBURSEMENT
@router.post("/settlement/upload")
def upload_reimbursement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    try:

        if not file.filename.endswith((".xlsx", ".xls")):
            raise HTTPException(
                status_code=400,
                detail="File harus berupa Excel"
            )

        df = pd.read_excel(file.file)

        required = [
            "employee_id",
            "settlement_date",
            "settlement_amount",
            "note"
        ]

        missing = [
            c
            for c in required
            if c not in df.columns
        ]

        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Kolom tidak ditemukan : {missing}"
            )

        inserted = 0
        skipped = 0

        for _, row in df.iterrows():

            try:

                employee = (

                    db.query(Employee)

                    .filter(
                        Employee.id == int(row["employee_id"])
                    )

                    .first()

                )

                if not employee:
                    skipped += 1
                    continue

                settlement = Settlement(

                    type=SettlementSource.REIMBURSEMENT,

                    employee_id=int(
                        row["employee_id"]
                    ),

                    advance_request_id=None,

                    settlement_date=pd.to_datetime(
                        row["settlement_date"]
                    ).date(),

                    settlement_amount=float(
                        row["settlement_amount"]
                    ),

                    note=None
                    if pd.isna(row["note"])
                    else row["note"]

                )

                db.add(settlement)

                inserted += 1

            except Exception:

                skipped += 1

                continue

        db.commit()

        return {

            "message": "Upload reimbursement berhasil",

            "rows": len(df),

            "inserted": inserted,

            "skipped": skipped

        }

    except HTTPException:
        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
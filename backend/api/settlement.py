import pandas as pd
from datetime import date
from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Query
)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import (
    Settlement,
    SettlementSource,
    Employee,
)

from io import BytesIO
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import joinedload
from etl.utils.settlement_mapper import map_columns
from etl.settlement_loader import load_settlement
from sqlalchemy import distinct

router = APIRouter(
    prefix="/settlements",
    tags=["Settlement"]
)

# SCHEMA

class ReimbursementCreate(BaseModel):
    ppc_no: str
    employee_name: str
    email: str
    settlement_date: date
    cost_center: str
    description: str
    settlement_amount: float

class ReimbursementUpdate(BaseModel):
    ppc_no: Optional[str] = None
    settlement_date: Optional[date] = None
    cost_center: Optional[str] = None
    description: Optional[str] = None
    settlement_amount: Optional[float] = None

def serialize_settlement(item: Settlement):
    employee = item.employee
    return {
        "id": item.id,
        "ppc_no": item.ppc_no,
        "source": item.source.value,
        "settlement_date": item.settlement_date,
        "employee_id": employee.id if employee else None,
        "employee_name": employee.employee_name if employee else None,
        "email": item.email,
        "cost_center": item.cost_center,
        "description": item.description,
        "settlement_amount": item.settlement_amount,
        "created_at": item.created_at,
        "updated_at": item.updated_at
    }

def apply_filter(
    query,
    source: Optional[SettlementSource] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):

    if source:
        query = query.filter(
            Settlement.source == source
        )
    if start_date:
        query = query.filter(
            Settlement.settlement_date >= start_date
        )
    if end_date:
        query = query.filter(
            Settlement.settlement_date <= end_date
        )
    return query

# SUMMARY CARD
@router.get("/summary")
def settlement_summary(
    source: Optional[SettlementSource] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = db.query(Settlement)

    query = apply_filter(
        query=query,
        source=source,
        start_date=start_date,
        end_date=end_date
    )

    settlements = query.all()

    return {
        "total":
            len(settlements),
        "advance":
            sum(
                1
                for item in settlements
                if item.source == SettlementSource.ADVANCE
            ),
        "reimbursement":
            sum(
                1
                for item in settlements
                if item.source == SettlementSource.REIMBURSEMENT
            ),
        "total_amount":
            sum(
                x.settlement_amount
                for x in settlements
            )
    }

# TABLE SETTLEMENT
@router.get("/list")
def settlement_list(
    source: Optional[SettlementSource] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = db.query(Settlement)

    query = apply_filter(
        query=query,
        source=source,
        start_date=start_date,
        end_date=end_date
    )

    settlements = (
        query
        .order_by(Settlement.settlement_date.desc())
        .all()
    )

    result = []

    for item in settlements:
        employee = item.employee
        result.append({
            "id": item.id,
            "ppc_no": item.ppc_no,
            "settlement_date": item.settlement_date,
            "employee_name": employee.employee_name if employee else None,
            "employee_email": item.email,
            "cost_center": item.cost_center,
            "description": item.description,
            "settlement_amount": item.settlement_amount,
            "source": item.source.value
        })

    return result

# CREATE REIMBURSEMENT
@router.post("/reimbursement")
def create_reimbursement(
    data: ReimbursementCreate,
    db: Session = Depends(get_db)
):

    employee = (
        db.query(Employee)
        .filter(
            Employee.employee_email == data.email
        )
        .first()
    )

    if employee is None:

        employee = (
            db.query(Employee)
            .filter(
                Employee.employee_name == data.employee_name
            )
            .first()
        )

    if employee is None:

        employee = Employee(
            employee_id=f"IMPORT-{data.ppc_no}",
            employee_name=data.employee_name,
            employee_email=data.email,
        )

        db.add(employee)
        db.flush()
        
    # cek PPC sudah ada atau belum
    exist = (
        db.query(Settlement)
        .filter(Settlement.ppc_no == data.ppc_no)
        .first()
    )

    if exist:
        raise HTTPException(
            status_code=400,
            detail="PPC Number sudah digunakan."
        )
    
    settlement = Settlement(
        ppc_no=data.ppc_no,
        source=SettlementSource.REIMBURSEMENT,
        employee_id=employee.id,
        settlement_date=data.settlement_date,
        cost_center=data.cost_center,
        email=employee.employee_email,
        description=data.description,
        settlement_amount=data.settlement_amount,
    )

    db.add(settlement)
    db.commit()
    db.refresh(settlement)

    return {
        "message": "Reimbursement berhasil ditambahkan.",
        "data": serialize_settlement(settlement)
    }

# UPDATE REIMBURSEMENT
@router.put("/reimbursement/{settlement_id}")
def update_reimbursement(
    settlement_id: int,
    data: ReimbursementUpdate,
    db: Session = Depends(get_db)
):

    settlement = (
        db.query(Settlement)
        .filter(
            Settlement.id == settlement_id
        )
        .first()
    )

    if not settlement:
        raise HTTPException(
            status_code=404,
            detail="Settlement tidak ditemukan."
        )

    if settlement.source != SettlementSource.REIMBURSEMENT:
        raise HTTPException(
            status_code=400,
            detail="Settlement Advance tidak dapat diubah."
        )

    if data.ppc_no is not None:

        exist = (
            db.query(Settlement)
            .filter(
                Settlement.ppc_no == data.ppc_no,
                Settlement.id != settlement.id
            )
            .first()
        )

        if exist:
            raise HTTPException(
                status_code=400,
                detail="PPC Number sudah digunakan."
            )
        settlement.ppc_no = data.ppc_no

    if data.settlement_date is not None:
        settlement.settlement_date = data.settlement_date
    if data.cost_center is not None:
        settlement.cost_center = data.cost_center
    if data.description is not None:
        settlement.description = data.description
    if data.settlement_amount is not None:
        settlement.settlement_amount = data.settlement_amount

    db.commit()
    db.refresh(settlement)
    return {
        "message": "Reimbursement berhasil diperbarui.",
        "data": serialize_settlement(settlement)
    }

# DELETE REIMBURSEMENT
@router.delete("/reimbursement/{settlement_id}")
def delete_reimbursement(
    settlement_id: int,
    db: Session = Depends(get_db)
):

    settlement = (
        db.query(Settlement)
        .filter(
            Settlement.id == settlement_id
        )
        .first()
    )

    if not settlement:
        raise HTTPException(
            status_code=404,
            detail="Settlement tidak ditemukan."
        )

    if settlement.source != SettlementSource.REIMBURSEMENT:
        raise HTTPException(
            status_code=400,
            detail="Settlement Advance tidak dapat dihapus."
        )

    db.delete(settlement)
    db.commit()
    return {
        "message": "Reimbursement berhasil dihapus."
    }

# Import Settlement Excel
@router.post("/import")
async def import_settlement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # Validasi File
    if not file.filename.endswith((".xlsx", ".xls")):

        raise HTTPException(
            status_code=400,
            detail="File harus berupa Excel (.xlsx atau .xls)"
        )

    try:

        # Read Excel
        df = pd.read_excel(file.file)

        if df.empty:

            raise HTTPException(
                status_code=400,
                detail="File Excel kosong."
            )

        # Mapping Kolom
        df = map_columns(df)
        print(df[["transaction_date", "settlement_date"]].head())

        # Load ke Database
        result = load_settlement(df, db)

        # Response
        return {
            "message": "Import Settlement berhasil",
            "filename": file.filename,
            **result
        }

    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(

            status_code=500,

            detail=f"Gagal import Settlement : {str(e)}"
        )
    
# Export Settlement Excel
@router.get("/export")
def export_settlement(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = (
        db.query(Settlement)
        .options(
            joinedload(Settlement.employee)
        )
    )

    # Filter Tanggal
    if start_date:
        query = query.filter(
            Settlement.settlement_date >= start_date
        )

    if end_date:
        query = query.filter(
            Settlement.settlement_date <= end_date
        )

    settlements = (
        query
        .order_by(
            Settlement.settlement_date.desc()
        )
        .all()
    )

    if not settlements:

        raise HTTPException(
            status_code=404,
            detail="Tidak ada data Settlement."
        )
    
    rows = []
    for item in settlements:
        rows.append({
            "PPC No": item.ppc_no,
            "Settlement Date": item.settlement_date,
            "Employee Name": (
                item.employee.employee_name
                if item.employee
                else ""
            ),
            "Email": item.email,
            "Cost Center": item.cost_center,
            "Description": item.description,
            "Settlement Amount": item.settlement_amount,
            "Source": item.source.value
        })

    df = pd.DataFrame(rows)
    output = BytesIO()

    with pd.ExcelWriter(
        output,
        engine="openpyxl"
    ) as writer:

        df.to_excel(
            writer,
            index=False,
            sheet_name="Settlement"
        )

    output.seek(0)
    
    return StreamingResponse(

        output,

        media_type=(
            "application/"
            "vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),

        headers={

            "Content-Disposition":
            "attachment; filename=settlement_export.xlsx"
        }
    )

# SEARCH USER
@router.get("/search-users")
def search_users(
    q: str = Query("", description="nama user"),
    db: Session = Depends(get_db)
):
    query = db.query(Employee.employee_name)

    # jika user mengetik keyword
    if q:
        query = query.filter(Employee.employee_name.ilike(f"%{q}%"))

    users = (
        query
        .distinct()
        .order_by(Employee.employee_name.asc())
        .limit(5)
        .all()
    )

    return [user[0] for user in users]

# SEARCH COST CENTER
@router.get("/search-cost-centers")
def search_cost_centers(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):

    cost_centers = (
        db.query(distinct(Settlement.cost_center))
        .filter(Settlement.cost_center.ilike(f"%{q}%"))
        .order_by(Settlement.cost_center)
        .limit(5)
        .all()
    )

    return [
        cost_center[0]
        for cost_center in cost_centers
        if cost_center[0] is not None
    ]

# DETAIL SETTLEMENT
@router.get("/{settlement_id}")
def settlement_detail(
    settlement_id: int,
    db: Session = Depends(get_db)
):
    
    settlement = (
        db.query(Settlement)
        .filter(
            Settlement.id == settlement_id
        )
        .first()
    )

    if not settlement:
        raise HTTPException(
            status_code=404,
            detail="Settlement tidak ditemukan."
        )

    return serialize_settlement(settlement)
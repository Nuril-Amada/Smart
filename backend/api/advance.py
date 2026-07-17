from datetime import date
from typing import Optional
import io
import pandas as pd

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    File,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import (
    AdvanceRequest,
    PamRequest,
    AdvanceStatus,
    Employee,
    Settlement,
    SettlementSource
)
from fastapi.responses import StreamingResponse
from etl.utils.advance_mapper import map_columns
from etl.advance_loader import load_advance

router = APIRouter(
    prefix="/advance",
    tags=["Advance"]
)


# PPC SCHEMA
class PPCCreate(BaseModel):
    ppc_no: str
    employee_id: int
    request_date: date
    cost_center: str
    email: str
    purpose: str
    amount: float
    due_date: date

class PPCUpdate(BaseModel):
    cost_center: Optional[str] = None
    email: Optional[str] = None
    purpose: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None

# PAM SCHEMA
class PAMCreate(BaseModel):
    pam_no: str
    employee_id: int
    cost_center: str
    purpose: str
    amount: float
    due_date: date

class PAMUpdate(BaseModel):
    cost_center: Optional[str] = None
    purpose: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None

# SETTLEMENT SCHEMA
class SettlementCreate(BaseModel):
    ppc_no: str
    settlement_date: date
    settlement_amount: float
    description: Optional[str] = None

# UPDATE PPC STATUS
def update_ppc_status(
    ppc: AdvanceRequest,
    db: Session
):

    settlement = (
        db.query(Settlement)
        .filter(
            Settlement.ppc_no == ppc.ppc_no,
            Settlement.source == SettlementSource.ADVANCE
        )
        .first()
    )

    # sudah settlement
    if settlement:
        ppc.status = AdvanceStatus.SETTLED

    # overdue
    elif (
        ppc.due_date
        and ppc.due_date < date.today()
    ):
        ppc.status = AdvanceStatus.OVERDUE

    # active
    else:
        ppc.status = AdvanceStatus.ACTIVE


# SERIALIZE PPC
# SERIALIZE PPC
def serialize_ppc(
    ppc: AdvanceRequest,
    db: Session
):

    settlement = (
        db.query(Settlement)
        .filter(
            Settlement.ppc_no == ppc.ppc_no,
            Settlement.source == SettlementSource.ADVANCE
        )
        .first()
    )

    update_ppc_status(ppc, db)

    return {
        "id": ppc.id,
        "request_date":
            ppc.request_date,
        "ppc_no":
            ppc.ppc_no,
        "employee_name":
            ppc.employee.employee_name
            if ppc.employee
            else None,
        "email":
            ppc.email,
        "cost_center":
            ppc.cost_center,
        "purpose":
            ppc.purpose,
        "amount":
            ppc.amount,
        "due_date":
            ppc.due_date,
        "settlement_date":
            settlement.settlement_date
            if settlement
            else None,
        "status":
            ppc.status.value,
        "created_at":
            ppc.created_at,
        "updated_at":
            ppc.updated_at
    }

# SERIALIZE PAM
def serialize_pam(pam: PamRequest):
    return {
        "id": pam.id,
        "pam_no": pam.pam_no,
        "employee_name":
            pam.employee.employee_name
            if pam.employee
            else None,
        "cost_center":
            pam.cost_center,
        "purpose":
            pam.purpose,
        "amount":
            pam.amount,
        "due_date":
            pam.due_date,
        "created_at":
            pam.created_at,
        "updated_at":
            pam.updated_at
    }

# APPLY DATE FILTER
def apply_date_filter(
    query,
    model,
    start_date: Optional[date],
    end_date: Optional[date]
):
    if start_date:
        query = query.filter(
            model.request_date >= start_date
        )
    if end_date:
        query = query.filter(
            model.request_date <= end_date
        )
    return query

# APPLY PPC FILTER
def apply_ppc_filter(
    query,
    employee_name: Optional[str],
    cost_center: Optional[str],
    status: Optional[str]
):

    if employee_name:
        query = query.filter(
            Employee.employee_name.ilike(
                f"%{employee_name}%"
            )
        )

    if cost_center:
        query = query.filter(
            AdvanceRequest.cost_center.ilike(
                f"%{cost_center}%"
            )
        )

    if status:
        query = query.filter(
            AdvanceRequest.status ==
            AdvanceStatus(status.upper())
        )
    return query


# CALCULATE OUTSTANDING AMOUNT
def calculate_outstanding_amount(
    advances,
    db: Session
):
    total = 0

    for advance in advances:
        update_ppc_status(advance, db)

        if advance.status != AdvanceStatus.SETTLED:
            total += advance.amount

    return total

# SUMMARY CARD
@router.get("/summary")
def advance_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)

):
    
    # PPC
    ppc_query = db.query(AdvanceRequest)
    ppc_query = apply_date_filter(
        query=ppc_query,
        model=AdvanceRequest,
        start_date=start_date,
        end_date=end_date
    )
    ppc_data = ppc_query.all()


    # PAM
    pam_query = db.query(PamRequest)
    pam_query = apply_date_filter(
        query=pam_query,
        model=PamRequest,
        start_date=start_date,
        end_date=end_date
    )

    pam_data = pam_query.all()

    # Update Status PPC
    active_count = 0
    overdue_count = 0

    for ppc in ppc_data:
        update_ppc_status(ppc, db)
        if ppc.status == AdvanceStatus.ACTIVE:
            active_count += 1
        elif ppc.status == AdvanceStatus.OVERDUE:
            overdue_count += 1

    # Commit apabila ada perubahan status
    db.commit()


    # Total Advance
    # PPC + PAM
    total_advance = (

        len(ppc_data)
        + len(pam_data)

    )

    # Outstanding Amount
    # PPC yang belum settled
    outstanding_amount = calculate_outstanding_amount(
        ppc_data,
        db
    )

    # Response
    return {
        "total_advance":
            total_advance,
        "active_advance":
            active_count,
        "overdue_advance":
            overdue_count,
        "outstanding_amount":
            outstanding_amount
    }

# PPC TABLE
@router.get("/ppc")
def get_all_ppc(
    employee_name: Optional[str] = Query(None),
    cost_center: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):

    query = (
        db.query(AdvanceRequest)
        .join(Employee)
    )

    # Filter employee name, cost center, status
    query = apply_ppc_filter(
        query=query,
        employee_name=employee_name,
        cost_center=cost_center,
        status=status
    )

    # Filter tanggal
    query = apply_date_filter(
        query=query,
        model=AdvanceRequest,
        start_date=start_date,
        end_date=end_date
    )

    # Ambil data
    ppc_list = (
        query
        .order_by(
            AdvanceRequest.request_date.desc()
        )
        .all()
    )

    # Update status terlebih dahulu
    for ppc in ppc_list:
        update_ppc_status(ppc, db)

    db.commit()

    # Serialize data
    return [
        serialize_ppc(ppc, db)
        for ppc in ppc_list
    ]

# PPC DETAIL
@router.get("/ppc/{ppc_id}")
def get_ppc_detail(
    ppc_id: int,
    db: Session = Depends(get_db)
):

    ppc = (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.id == ppc_id
        )
        .first()
    )

    if not ppc:
        raise HTTPException(
            status_code=404,
            detail="PPC tidak ditemukan."
        )

    update_ppc_status(ppc, db)

    db.commit()
    db.refresh(ppc)

    return serialize_ppc(
        ppc,
        db
    )

# CREATE PPC
@router.post("/ppc")
def create_ppc(
    data: PPCCreate,
    db: Session = Depends(get_db)
):

    # Employee harus tersedia
    employee = (
        db.query(Employee)
        .filter(
            Employee.id == data.employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee tidak ditemukan."
        )

    # PPC Number tidak boleh duplicate
    exists = (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.ppc_no == data.ppc_no
        )
        .first()
    )

    if exists:
        raise HTTPException(
            status_code=400,
            detail="Nomor PPC sudah digunakan."
        )

    # Validasi due date
    if data.due_date < data.request_date:
        raise HTTPException(
            status_code=400,
            detail="Due date tidak valid."
        )

    ppc = AdvanceRequest(
        ppc_no=data.ppc_no,
        employee_id=data.employee_id,
        request_date=data.request_date,
        cost_center=data.cost_center,
        email=data.email,
        purpose=data.purpose,
        amount=data.amount,
        due_date=data.due_date,
        status=AdvanceStatus.ACTIVE
    )

    db.add(ppc)
    db.commit()
    db.refresh(ppc)

    return serialize_ppc(
        ppc,
        db
    )

# UPDATE PPC
@router.put("/ppc/{ppc_id}")
def update_ppc(
    ppc_id: int,
    data: PPCUpdate,
    db: Session = Depends(get_db)
):

    ppc = (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.id == ppc_id
        )
        .first()
    )

    if not ppc:
        raise HTTPException(
            status_code=404,
            detail="PPC tidak ditemukan."
        )
    
    update_ppc_status(ppc, db)

    # Tidak boleh edit apabila sudah settled
    if ppc.status == AdvanceStatus.SETTLED:
        raise HTTPException(
            status_code=400,
            detail="PPC yang sudah settled tidak dapat diubah."
        )


    if data.cost_center is not None:
        ppc.cost_center = data.cost_center
    if data.email is not None:
        ppc.email = data.email
    if data.purpose is not None:
        ppc.purpose = data.purpose
    if data.amount is not None:
        ppc.amount = data.amount
    if data.due_date is not None:
        ppc.due_date = data.due_date

    update_ppc_status(ppc, db)

    db.commit()
    db.refresh(ppc)

    return serialize_ppc(
        ppc,
        db
    )

# DELETE PPC
@router.delete("/ppc/{ppc_id}")
def delete_ppc(
    ppc_id: int,
    db: Session = Depends(get_db)
):

    ppc = (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.id == ppc_id
        )
        .first()
    )

    if not ppc:
        raise HTTPException(
            status_code=404,
            detail="PPC tidak ditemukan."
        )

    update_ppc_status(ppc, db)

    if ppc.status == AdvanceStatus.SETTLED:
        raise HTTPException(
            status_code=400,
            detail="PPC yang sudah settled tidak dapat dihapus."
        )

    db.delete(ppc)
    db.commit()

    return {
        "message":
            "PPC berhasil dihapus."
    }

# SEARCH EMPLOYEE
@router.get("/search-users")
def search_users(
    q: str = "",
    db: Session = Depends(get_db)
):

    if not q:
        return []

    employees = (
        db.query(Employee)
        .filter(
            Employee.employee_name.ilike(
                f"%{q}%"
            )
        )
        .limit(10)
        .all()
    )

    return [

        {
            "id": employee.id,
            "employee_name": employee.employee_name
        }

        for employee in employees

    ]

# SEARCH COST CENTER
@router.get("/search-cost-centers")
def search_cost_centers(
    q: str = "",
    db: Session = Depends(get_db)
):

    if not q:
        return []

    # Cost Center PPC
    ppc_cc = (
        db.query(
            AdvanceRequest.cost_center
        )
        .filter(
            AdvanceRequest.cost_center.ilike(
                f"%{q}%"
            )
        )
        .distinct()
        .all()
    )

    # Cost Center PAM
    pam_cc = (
        db.query(
            PamRequest.cost_center
        )
        .filter(
            PamRequest.cost_center.ilike(
                f"%{q}%"
            )
        )
        .distinct()
        .all()
    )

    # Gabungkan
    cost_centers = set()

    for cc in ppc_cc:
        cost_centers.add(cc[0])

    for cc in pam_cc:
        cost_centers.add(cc[0])

    return sorted(list(cost_centers))

# PAM TABLE
@router.get("/pam")
def get_all_pam(
    employee_name: Optional[str] = Query(None),
    cost_center: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):

    query = (
        db.query(PamRequest)
        .join(Employee)
    )

    if employee_name:
        query = query.filter(
            Employee.employee_name.ilike(
                f"%{employee_name}%"
            )
        )

    if cost_center:
        query = query.filter(
            PamRequest.cost_center.ilike(
                f"%{cost_center}%"
            )
        )


    pam_list = (
        query
        .order_by(
            PamRequest.due_date.desc()
        )
        .all()
    )


    return [
        serialize_pam(pam)
        for pam in pam_list
    ]

# PAM DETAIL
@router.get("/pam/{pam_id}")
def get_pam_detail(
    pam_id: int,
    db: Session = Depends(get_db)
):

    pam = (
        db.query(PamRequest)
        .filter(
            PamRequest.id == pam_id
        )
        .first()
    )

    if not pam:
        raise HTTPException(
            status_code=404,
            detail="PAM tidak ditemukan."
        )

    return serialize_pam(pam)

# CREATE PAM
@router.post("/pam")
def create_pam(
    data: PAMCreate,
    db: Session = Depends(get_db)
):

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == data.employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee tidak ditemukan."
        )

    exists = (
        db.query(PamRequest)
        .filter(
            PamRequest.pam_no == data.pam_no
        )
        .first()
    )

    if exists:
        raise HTTPException(
            status_code=400,
            detail="Nomor PAM sudah digunakan."
        )

    pam = PamRequest(
        pam_no=data.pam_no,
        employee_id=data.employee_id,
        cost_center=data.cost_center,
        purpose=data.purpose,
        amount=data.amount,
        due_date=data.due_date
    )

    db.add(pam)
    db.commit()
    db.refresh(pam)

    return serialize_pam(pam)

# UPDATE PAM
@router.put("/pam/{pam_id}")
def update_pam(
    pam_id: int,
    data: PAMUpdate,
    db: Session = Depends(get_db)
):

    pam = (
        db.query(PamRequest)
        .filter(
            PamRequest.id == pam_id
        )
        .first()
    )

    if not pam:
        raise HTTPException(
            status_code=404,
            detail="PAM tidak ditemukan."
        )

    if data.cost_center is not None:
        pam.cost_center = data.cost_center
    if data.purpose is not None:
        pam.purpose = data.purpose
    if data.amount is not None:
        pam.amount = data.amount
    if data.due_date is not None:
        pam.due_date = data.due_date

    db.commit()
    db.refresh(pam)

    return serialize_pam(pam)

# DELETE PAM
@router.delete("/pam/{pam_id}")
def delete_pam(
    pam_id: int,
    db: Session = Depends(get_db)
):

    pam = (
        db.query(PamRequest)
        .filter(
            PamRequest.id == pam_id
        )
        .first()
    )

    if not pam:
        raise HTTPException(
            status_code=404,
            detail="PAM tidak ditemukan."
        )

    db.delete(pam)
    db.commit()

    return {
        "message":
            "PAM berhasil dihapus."
    }

# EXPORT PPC
@router.get("/export")
def export_ppc(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):

    query = (
        db.query(AdvanceRequest)
        .join(Employee)
    )

    # Filter Tanggal
    query = apply_date_filter(
        query=query,
        model=AdvanceRequest,
        start_date=start_date,
        end_date=end_date
    )

    ppc_list = (
        query
        .order_by(
            AdvanceRequest.request_date.desc()
        )
        .all()
    )

    # Tidak ada data
    if not ppc_list:
        raise HTTPException(
            status_code=404,
            detail="Tidak ada data PPC."
        )

    rows = []

    for ppc in ppc_list:

        # Update status terlebih dahulu
        update_ppc_status(ppc, db)

        rows.append({
            "Request Date": ppc.request_date,
            "PPC No": ppc.ppc_no,
            "Employee Name": (
                ppc.employee.employee_name
                if ppc.employee
                else ""
            ),
            "Email": ppc.email,
            "Cost Center": ppc.cost_center,
            "Purpose": ppc.purpose,
            "Amount": ppc.amount,
            "Due Date": ppc.due_date,
            "Status": ppc.status.value
        })

    # Simpan perubahan status (ACTIVE -> OVERDUE)
    db.commit()

    df = pd.DataFrame(rows)

    output = io.BytesIO()

    with pd.ExcelWriter(
        output,
        engine="openpyxl"
    ) as writer:

        df.to_excel(
            writer,
            index=False,
            sheet_name="Advance"
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
            "attachment; filename=advance_export.xlsx"
        }
    )

# IMPORT PPC
@router.post("/import")
async def import_ppc(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # Validasi file
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="File harus berupa Excel (.xlsx atau .xls)"
        )

    try:

        # Baca Excel
        df = pd.read_excel(file.file)

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="File Excel kosong."
            )

        # Mapping kolom
        df = map_columns(df)

        # Load ke database
        result = load_advance(df, db)

        return {
            "message": "Import PPC berhasil",
            "filename": file.filename,
            **result
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal import PPC : {str(e)}"
        )
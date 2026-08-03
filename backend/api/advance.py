from datetime import date, timedelta
from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import (
    AdvanceRequest,
    AdvanceStatus,
    Employee,
    Settlement,
    SettlementSource
)
from etl.utils.ppc_helper import generate_ppc_no

router = APIRouter(
    prefix="/advance",
    tags=["Advance"]
)


# PPC SCHEMA
class PPCCreate(BaseModel):
    employee_name: str
    request_date: date
    cost_center: str
    purpose: str
    amount: float
    due_date: Optional[date] = None

# class PPCUpdate(BaseModel):
#     employee_name: Optional[str] = None
#     cost_center: Optional[str] = None
#     purpose: Optional[str] = None
#     amount: Optional[float] = None
#     due_date: Optional[date] = None

# SETTLEMENT SCHEMA
class SettlementCreate(BaseModel):
    settlement_date: date
    settlement_amount: float
    description: str

# UPDATE PPC STATUS
def update_ppc_status(ppc):

    # FINAL STATE
    if ppc.status in [
        AdvanceStatus.CANCEL,
        AdvanceStatus.SETTLED
    ]:
        return

    # OVERDUE
    if (
        ppc.due_date
        and ppc.due_date < date.today()
    ):
        ppc.status = AdvanceStatus.OVERDUE

    # ACTIVE
    else:
        ppc.status = AdvanceStatus.ACTIVE

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

    return {
        "id": ppc.id,
        "request_date":
            ppc.request_date,
        "ppc_no":
            ppc.ppc_no,
        "employee_name":
            ppc.employee_name,
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
        "settlement_amount":
            settlement.settlement_amount
            if settlement
            else None,
        "status":
            ppc.status.value,
        "created_at":
            ppc.created_at,
        "updated_at":
            ppc.updated_at
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
    employee_name: Optional[str] = None,
    cost_center: Optional[str] = None,
    status: Optional[str] = None
):

    if employee_name and isinstance(employee_name, str):
        query = query.filter(
            AdvanceRequest.employee_name.ilike(
                f"%{employee_name}%"
            )
        )

    if cost_center and isinstance(cost_center, str):
        query = query.filter(
            AdvanceRequest.cost_center.ilike(
                f"%{cost_center}%"
            )
        )

    if status and isinstance(status, str):
        try:
            query = query.filter(
                AdvanceRequest.status ==
                AdvanceStatus(status.upper())
            )
        except ValueError:
            pass
    return query

# CALCULATE DUE DATEfrom datetime import timedelta
def calculate_due_date(request_date):
    due_date = request_date
    working_days = 0

    while working_days < 2:

        due_date += timedelta(days=1)

        # Senin = 0
        # Minggu = 6
        if due_date.weekday() < 5:
            working_days += 1

    return due_date

# CALCULATE OUTSTANDING AMOUNT
def calculate_outstanding_amount(
    advances,
):
    total = 0
    for advance in advances:
        update_ppc_status(advance)
        if advance.status in [
            AdvanceStatus.ACTIVE,
            AdvanceStatus.OVERDUE
        ]:
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

    # Update Status PPC
    active_count = 0
    overdue_count = 0

    for ppc in ppc_data:
        update_ppc_status(ppc)
        if ppc.status == AdvanceStatus.ACTIVE:
            active_count += 1
        elif ppc.status == AdvanceStatus.OVERDUE:
            overdue_count += 1

    # Commit apabila ada perubahan status
    db.commit()


    # Total Advance
    total_advance = 0

    for ppc in ppc_data:

        if ppc.status in [
            AdvanceStatus.ACTIVE,
            AdvanceStatus.OVERDUE,
            AdvanceStatus.SETTLED
        ]:

            total_advance += 1

    # Outstanding Amount
    # PPC yang belum settled
    outstanding_amount = calculate_outstanding_amount(
        ppc_data,
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

    query = (db.query(AdvanceRequest))

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

    # Ambil data (terbaru diinput & tanggal terbaru di atas)
    ppc_list = (
        query
        .order_by(
            AdvanceRequest.request_date.desc(),
            AdvanceRequest.created_at.desc(),
            AdvanceRequest.id.desc()
        )
        .all()
    )

    # Update status terlebih dahulu
    for ppc in ppc_list:
        update_ppc_status(ppc)

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

    update_ppc_status(ppc)

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

    employee_name = data.employee_name.strip()

    employee = (
        db.query(Employee)
        .filter(
            Employee.employee_name.ilike(
                employee_name
            )
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee tidak ditemukan."
        )

    # Due Date otomatis +2 hari apabila kosong
    due_date = data.due_date

    if due_date is None:
        due_date = calculate_due_date(data.request_date)

    # Validasi due date
    if due_date < data.request_date:
        raise HTTPException(
            status_code=400,
            detail="Due date tidak valid."
        )

    # Generate PPC Number otomatis
    ppc_no = generate_ppc_no(
        db=db,
        request_date=data.request_date,
        record_sequence=True,
    )

    ppc = AdvanceRequest(
        ppc_no=ppc_no,
        employee_name=employee.employee_name,
        request_date=data.request_date,
        cost_center=data.cost_center,
        purpose=data.purpose,
        amount=data.amount,
        due_date=due_date,
        status=AdvanceStatus.ACTIVE
    )

    db.add(ppc)
    db.commit()
    db.refresh(ppc)

    return {
        "message": "Advance berhasil ditambahkan.",
        "data": serialize_ppc(ppc, db)
    }

# # UPDATE PPC
# @router.put("/ppc/{ppc_id}")
# def update_ppc(
#     ppc_id: int,
#     data: PPCUpdate,
#     db: Session = Depends(get_db)
# ):

#     ppc = (
#         db.query(AdvanceRequest)
#         .filter(
#             AdvanceRequest.id == ppc_id
#         )
#         .first()
#     )

#     if not ppc:
#         raise HTTPException(
#             status_code=404,
#             detail="PPC tidak ditemukan."
#         )

#     # Update status terlebih dahulu
#     update_ppc_status(ppc, db)

#     # Tidak boleh edit apabila sudah settled
#     if ppc.status == AdvanceStatus.SETTLED:
#         raise HTTPException(
#             status_code=400,
#             detail="PPC yang sudah settled tidak dapat diubah."
#         )
    
#     if ppc.status == AdvanceStatus.CANCEL:
#         raise HTTPException(
#             status_code=400,
#             detail="PPC yang sudah dicancel tidak dapat diubah."
#         )

#     # Validasi employee apabila diubah
#     if data.employee_name is not None:

#         employee_name = data.employee_name.strip()

#         employee = (
#             db.query(Employee)
#             .filter(
#                 Employee.employee_name.ilike(
#                     employee_name
#                 )
#             )
#             .first()
#         )

#         if not employee:
#             raise HTTPException(
#                 status_code=404,
#                 detail="Employee tidak ditemukan."
#             )

#         ppc.employee_name = employee.employee_name

#     # Update field lainnya
#     if data.cost_center is not None:
#         ppc.cost_center = data.cost_center

#     if data.purpose is not None:
#         ppc.purpose = data.purpose

#     if data.amount is not None:
#         ppc.amount = data.amount

#     if data.due_date is not None:

#         # Due date tidak boleh lebih kecil dari request date
#         if data.due_date < ppc.request_date:
#             raise HTTPException(
#                 status_code=400,
#                 detail="Due date tidak valid."
#             )

#         ppc.due_date = data.due_date

#     # Update status kembali
#     update_ppc_status(ppc, db)

#     db.commit()
#     db.refresh(ppc)

#     return serialize_ppc(
#         ppc,
#         db
#     )

# CANCEL PPC
@router.put("/ppc/{ppc_id}/cancel")
def cancel_ppc(
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

    update_ppc_status(ppc)

    # Tidak boleh cancel apabila sudah settled
    if ppc.status == AdvanceStatus.SETTLED:
        raise HTTPException(
            status_code=400,
            detail="PPC yang sudah settled tidak dapat dicancel."
        )

    # Sudah cancel
    if ppc.status == AdvanceStatus.CANCEL:
        raise HTTPException(
            status_code=400,
            detail="PPC sudah dicancel."
        )

    ppc.status = AdvanceStatus.CANCEL

    db.commit()
    db.refresh(ppc)

    return {
        "message": "PPC berhasil dicancel."
    }

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

    db.delete(ppc)
    db.commit()

    return {
        "message": "PPC berhasil dihapus."
    }

# CREATE SETTLEMENT FROM ADVANCE
@router.post("/ppc/{ppc_id}/settlement")
def create_settlement(
    ppc_id: int,
    data: SettlementCreate,
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

    update_ppc_status(ppc)

    if ppc.status == AdvanceStatus.CANCEL:
        raise HTTPException(
            status_code=400,
            detail="PPC yang sudah dicancel tidak dapat disettlement."
        )

    if ppc.status == AdvanceStatus.SETTLED:
        raise HTTPException(
            status_code=400,
            detail="PPC sudah disettlement."
        )

    # Settlement amount harus lebih dari 0
    if data.settlement_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Settlement amount harus lebih dari Rp0."
        )

    # Maksimal settlement Rp1.000.000
    if data.settlement_amount > 1_000_000:
        raise HTTPException(
            status_code=400,
            detail="Settlement amount tidak boleh melebihi Rp1.000.000."
        )

    existing = (
        db.query(Settlement)
        .filter(
            Settlement.ppc_no == ppc.ppc_no,
            Settlement.source == SettlementSource.ADVANCE
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Settlement sudah tersedia."
        )

    settlement = Settlement(
        ppc_no=ppc.ppc_no,
        source=SettlementSource.ADVANCE,
        employee_name=ppc.employee_name,
        settlement_date=data.settlement_date,
        cost_center=ppc.cost_center,
        description=data.description,
        settlement_amount=data.settlement_amount,
    )

    db.add(settlement)
    ppc.status = AdvanceStatus.SETTLED
    
    db.commit()
    db.refresh(settlement)
    db.refresh(ppc)

    return {
        "message": "Settlement berhasil dibuat.",
        "ppc_no": settlement.ppc_no
    }

# RECEIPT SETTLEMENT
@router.get("/ppc/{ppc_id}/receipt")
def get_settlement_receipt(
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

    settlement = (
        db.query(Settlement)
        .filter(
            Settlement.ppc_no == ppc.ppc_no,
            Settlement.source == SettlementSource.ADVANCE
        )
        .first()
    )

    if not settlement:
        raise HTTPException(
            status_code=404,
            detail="Settlement belum tersedia."
        )

    return {
        "ppc_no": settlement.ppc_no,
        "employee_name": settlement.employee_name,
        "cost_center": settlement.cost_center,
        "settlement_date": settlement.settlement_date,
        "settlement_amount": settlement.settlement_amount,
        "description": settlement.description,
        "created_at": settlement.created_at,
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
            "employee_name": employee.employee_name,
            "employee_email": employee.employee_email,
            "department_email": employee.department_email,
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
    return [
        row[0]
        for row in ppc_cc
        if row[0] is not None
    ]

@router.get("/generate-ppc-no")
def preview_ppc_number(
    request_date: date,
    db: Session = Depends(get_db)
):

    ppc_no = generate_ppc_no(
        db=db,
        request_date=request_date
    )

    return {
        "ppc_no": ppc_no
    }
from datetime import date, datetime
from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import (
    Settlement,
    SettlementSource,
    Employee,
)
from sqlalchemy import distinct
from etl.utils.ppc_helper import generate_ppc_no

router = APIRouter(
    prefix="/settlements",
    tags=["Settlement"]
)

# SCHEMA
class ReimbursementCreate(BaseModel):
    employee_name: str
    settlement_date: date
    cost_center: str
    description: str
    settlement_amount: float

# class ReimbursementUpdate(BaseModel):
#     employee_name: Optional[str] = None
#     settlement_date: Optional[date] = None
#     cost_center: Optional[str] = None
#     description: Optional[str] = None
#     settlement_amount: Optional[float] = None

def serialize_settlement(item: Settlement):

    return {
        "id": item.id,
        "ppc_no": item.ppc_no,
        "source": item.source.value,
        "settlement_date": item.settlement_date,
        "employee_name": item.employee_name,
        "cost_center": item.cost_center,
        "description": item.description,
        "settlement_amount": item.settlement_amount,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "is_checked": item.is_checked,
    }

def apply_filter(
    query,
    source: Optional[SettlementSource] = None,
    employee_name: Optional[str] = None,
    cost_center: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):

    if source:
        query = query.filter(
            Settlement.source == source
        )

    if employee_name:
        query = query.filter(
            Settlement.employee_name.ilike(
                f"%{employee_name}%"
            )
        )

    if cost_center:
        query = query.filter(
            Settlement.cost_center.ilike(
                f"%{cost_center}%"
            )
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
    employee_name: Optional[str] = None,
    cost_center: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = (
        db.query(Settlement)
        .filter(
            Settlement.is_deleted == False
        )
    )

    query = apply_filter(
        query=query,
        source=source,
        employee_name=employee_name,
        cost_center=cost_center,
        start_date=start_date,
        end_date=end_date
    )

    settlements = query.all()

    total_count = len(settlements)
    total_adv = sum(
        1 for item in settlements if item.source == SettlementSource.ADVANCE
    )
    total_reimb = sum(
        1 for item in settlements if item.source == SettlementSource.REIMBURSEMENT
    )
    total_amt = sum(item.settlement_amount for item in settlements)

    return {
        "total": total_count,
        "advance": total_adv,
        "reimbursement": total_reimb,
        "total_amount": total_amt,
        "total_settlement": total_count,
        "total_advance": total_adv,
        "total_reimbursement": total_reimb,
        "total_settlement_amount": total_amt,
    }


# TABLE SETTLEMENT
@router.get("/list")
def settlement_list(
    source: Optional[SettlementSource] = None,
    employee_name: Optional[str] = None,
    cost_center: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)

):

    query = (
        db.query(Settlement)
        .filter(
            Settlement.is_deleted == False
        )
    )
    query = apply_filter(
        query=query,
        source=source,
        employee_name=employee_name,
        cost_center=cost_center,
        start_date=start_date,
        end_date=end_date,
    )

    settlements = (
        query
        .order_by(
            Settlement.settlement_date.desc(),
            Settlement.created_at.desc(),
            Settlement.id.desc()
        )
        .all()
    )

    return [
        {
            "id": item.id,
            "ppc_no": item.ppc_no,
            "source": item.source.value,
            "settlement_date": item.settlement_date,
            "employee_name": item.employee_name,
            "cost_center": item.cost_center,
            "description": item.description,
            "settlement_amount": item.settlement_amount,
            "is_checked": item.is_checked,
        }
        for item in settlements
    ]

# CHECK / UNCHECK SETTLEMENT
@router.patch("/{settlement_id}/check")
def toggle_settlement_check(
    settlement_id: int,
    db: Session = Depends(get_db)
):

    settlement = (
        db.query(Settlement)
        .filter(
            Settlement.id == settlement_id,
            Settlement.is_deleted == False
        )
        .first()
    )

    if not settlement:
        raise HTTPException(
            status_code=404,
            detail="Settlement tidak ditemukan."
        )

    settlement.is_checked = not settlement.is_checked

    db.commit()
    db.refresh(settlement)

    return {
        "id": settlement.id,
        "is_checked": settlement.is_checked,
        "message": "Checklist berhasil diperbarui."
    }

# CREATE REIMBURSEMENT
@router.post("/reimbursement")
def create_reimbursement(
    data: ReimbursementCreate,
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
    
    if data.settlement_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Settlement amount harus lebih dari 0."
        )
    
    # Generate PPC Number otomatis
    ppc_no = generate_ppc_no(
        db=db,
        request_date=data.settlement_date,
        record_sequence=True,
    )

    settlement = Settlement(
        ppc_no=ppc_no,
        source=SettlementSource.REIMBURSEMENT,
        employee_name=employee.employee_name,
        settlement_date=data.settlement_date,
        cost_center=data.cost_center,
        description=data.description,
        settlement_amount=data.settlement_amount,
    )

    db.add(settlement)
    db.commit()
    db.refresh(settlement)

    return {
        "message":
            "Reimbursement berhasil ditambahkan.",
        "data":
            serialize_settlement(settlement)
    }

# # UPDATE REIMBURSEMENT
# @router.put("/reimbursement/{settlement_id}")
# def update_reimbursement(
#     settlement_id: int,
#     data: ReimbursementUpdate,
#     db: Session = Depends(get_db)
# ):

#     settlement = (
#         db.query(Settlement)
#         .filter(
#             Settlement.id == settlement_id
#         )
#         .first()
#     )

#     if not settlement:
#         raise HTTPException(
#             status_code=404,
#             detail="Settlement tidak ditemukan."
#         )

#     if settlement.source != SettlementSource.REIMBURSEMENT:
#         raise HTTPException(
#             status_code=400,
#             detail="Settlement Advance tidak dapat diubah."
#         )
#     # Update employee
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

#         settlement.employee_id = employee.id
#         settlement.email = employee.employee_email

#     if data.settlement_date is not None:
#         settlement.settlement_date = data.settlement_date
#     if data.cost_center is not None:
#         settlement.cost_center = data.cost_center
#     if data.description is not None:
#         settlement.description = data.description
#     if data.settlement_amount is not None:
#         if data.settlement_amount <= 0:
#             raise HTTPException(
#                 status_code=400,
#                 detail="Settlement amount harus lebih dari 0."
#             )

#         settlement.settlement_amount = data.settlement_amount

#     db.commit()
#     db.refresh(settlement)
#     return {
#         "message": "Reimbursement berhasil diperbarui.",
#         "data": serialize_settlement(settlement)
#     }

# DELETE REIMBURSEMENT
@router.delete("/{settlement_id}")
def delete_reimbursement(
    settlement_id:int,
    db:Session=Depends(get_db)
):

    settlement = (
        db.query(Settlement)
        .filter(
            Settlement.id == settlement_id,
            Settlement.is_deleted == False
        )
        .first()
    )

    if not settlement:
        raise HTTPException(
            status_code=404,
            detail="Settlement tidak ditemukan."
        )

    settlement.is_deleted=True
    settlement.deleted_at=datetime.now()

    db.commit()

    return{
        "id":settlement.id,
        "message":"Settlement berhasil dihapus."
    }

# SEARCH USER
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
            "employee_name":
                employee.employee_name,
            "employee_email":
                employee.employee_email,
            "department_email":
                employee.department_email,
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

    cost_centers = (

        db.query(
            distinct(
                Settlement.cost_center
            )
        )
        .filter(
            Settlement.cost_center.ilike(
                f"%{q}%"
            ),
            Settlement.is_deleted == False
        )
        .limit(10)
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
            Settlement.id == settlement_id,
            Settlement.is_deleted == False
        )
        .first()
    )

    if not settlement:
        raise HTTPException(
            status_code=404,
            detail="Settlement tidak ditemukan."
        )

    return serialize_settlement(settlement)
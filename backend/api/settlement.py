from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import SessionLocal
from database.models import (
    Settlement,
    SettlementSource,
    AdvanceRequest,
    AdvanceStatus,
    Employee,
)

router = APIRouter(
    prefix="/settlements",
    tags=["Settlement"]
)

# DATABASE
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# SCHEMA
class ReimbursementCreate(BaseModel):
    employee_id: int
    settlement_date: date
    settlement_amount: float
    note: str

class ReimbursementUpdate(BaseModel):
    settlement_date: Optional[date] = None
    settlement_amount: Optional[float] = None
    note: Optional[str] = None

# SERIALIZER
def serialize_settlement(item: Settlement):
    employee = item.employee
    advance = item.advance_request
    return {
        "id": item.id,
        "source": item.type.value,
        "settlement_date": str(item.settlement_date),
        "settlement_amount": item.settlement_amount,
        "note": item.note,
        "employee": {
            "id": employee.id if employee else None,
            "name": employee.employee_name if employee else None,
            "email": employee.employee_email if employee else None,
        },
        "advance": None if not advance else {
            "id": advance.id,
            "request_no": advance.request_no,
            "advance_type": advance.advance_type.value,
            "cost_center": advance.cost_center,
            "status": advance.status.value,
        },
        "created_at": str(item.created_at),
        "updated_at": str(item.updated_at),
    }

# GET ALL SETTLEMENT
@router.get("/")
def get_all_settlements(
    source: Optional[SettlementSource] = None,
    employee_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = db.query(Settlement)
    if source:
        query = query.filter(
            Settlement.type == source
        )
    if employee_id:
        query = query.filter(
            Settlement.employee_id == employee_id
        )
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

    return [
        serialize_settlement(item)
        for item in settlements
    ]

# GET DETAIL
@router.get("/{settlement_id}")
def get_settlement_detail(
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
            detail="Settlement tidak ditemukan"
        )
    return serialize_settlement(settlement)

# CREATE REIMBURSEMENT
@router.post("/reimbursement")
def create_reimbursement(
    data: ReimbursementCreate,
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
            detail="Employee tidak ditemukan"
        )

    settlement = Settlement(
        type=SettlementSource.REIMBURSEMENT,
        employee_id=data.employee_id,
        advance_request_id=None,
        settlement_date=data.settlement_date,
        settlement_amount=data.settlement_amount,
        note=data.note,
    )

    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    return {
        "message": "Reimbursement berhasil ditambahkan",
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
            detail="Settlement tidak ditemukan"
        )

    if settlement.type != SettlementSource.REIMBURSEMENT:
        raise HTTPException(
            status_code=400,
            detail="Hanya reimbursement yang dapat diubah"
        )

    if data.settlement_date is not None:
        settlement.settlement_date = data.settlement_date

    if data.settlement_amount is not None:
        settlement.settlement_amount = data.settlement_amount

    if data.note is not None:
        settlement.note = data.note

    db.commit()
    db.refresh(settlement)
    return {
        "message": "Reimbursement berhasil diperbarui",
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

            detail="Settlement tidak ditemukan"

        )

    if settlement.type != SettlementSource.REIMBURSEMENT:

        raise HTTPException(

            status_code=400,

            detail="Settlement Advance tidak dapat dihapus dari menu Settlement"
        )

    db.delete(settlement)

    db.commit()

    return {
        "message": "Reimbursement berhasil dihapus"
    }

# SUMMARY
@router.get("/summary")
def settlement_summary(

    start_date: Optional[date] = None,
    end_date: Optional[date] = None,

    db: Session = Depends(get_db)

):

    query = db.query(Settlement)

    if start_date:
        query = query.filter(
            Settlement.settlement_date >= start_date
        )

    if end_date:
        query = query.filter(
            Settlement.settlement_date <= end_date
        )

    settlements = query.all()

    total_settlement = len(settlements)

    total_advance = sum(
        1
        for item in settlements
        if item.type == SettlementSource.ADVANCE
    )

    total_reimbursement = sum(
        1
        for item in settlements
        if item.type == SettlementSource.REIMBURSEMENT
    )

    total_amount = sum(
        item.settlement_amount
        for item in settlements
    )

    return {

        "total_settlement": total_settlement,

        "total_advance": total_advance,

        "total_reimbursement": total_reimbursement,

        "total_amount": total_amount

    }
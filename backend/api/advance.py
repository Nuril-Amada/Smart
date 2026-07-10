from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import (
    AdvanceRequest,
    AdvanceStatus,
    Employee,
    Settlement,
    SettlementSource,
)

router = APIRouter(
    prefix="/advance",
    tags=["Advance"]
)

# SCHEMA
class AdvanceCreate(BaseModel):
    employee_id: int
    request_no: str
    request_date: date
    amount: float
    purpose: str
    deadline_date: date

class AdvanceUpdate(BaseModel):
    purpose: Optional[str] = None
    amount: Optional[float] = None
    deadline_date: Optional[date] = None

class SettlementCreate(BaseModel):
    settlement_date: date
    settlement_amount: float
    note: Optional[str] = None
    sap_document_no: Optional[str] = None

# HELPER
def update_status(advance: AdvanceRequest):
    """
    Status otomatis.
    ACTIVE
        ↓
    OVERDUE (deadline lewat)
    jika sudah memiliki settlement
        ↓
    SETTLED
    """

    if advance.settlement is not None:

        advance.status = AdvanceStatus.SETTLED
        return

    # Deadline 
    if (
        advance.deadline_date
        and advance.deadline_date < date.today()
    ):

        advance.status = AdvanceStatus.OVERDUE

    else:

        advance.status = AdvanceStatus.ACTIVE

def serialize_advance(adv: AdvanceRequest):
    update_status(adv)
    return {
        "id": adv.id,
        "request_no": adv.request_no,
        "request_date": adv.request_date,
        "employee_id": adv.employee_id,
        "employee_name":
            adv.employee.employee_name
            if adv.employee else None,
        "employee_email":
            adv.employee.employee_email
            if adv.employee else None,
        "cost_center":
            adv.employee.cost_center
            if hasattr(adv.employee, "cost_center")
            else None,
        "purpose": adv.purpose,
        "amount": adv.amount,
        "deadline_date": adv.deadline_date,
        "status": adv.status.value,
        "advance_type":
            "<=1JT"
            if adv.amount <= 1000000
            else ">1JT",
        "has_settlement":
            adv.settlement is not None,
        "created_at": adv.created_at,
        "updated_at": adv.updated_at
    }


# GET ALL
@router.get("/")
def get_all_advance(
    status: Optional[str] = Query(None),
    advance_type: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(AdvanceRequest)
    if employee_id:
        query = query.filter(
            AdvanceRequest.employee_id == employee_id
        )
    advances = (
        query
        .order_by(
            AdvanceRequest.request_date.desc()
        )
        .all()
    )

    result = []
    changed = False
    for adv in advances:
        old_status = adv.status
        update_status(adv)
        if adv.status != old_status:
            changed = True
        item = serialize_advance(adv)

        if status:

            if item["status"] != status.upper():
                continue

        if advance_type:

            if item["advance_type"] != advance_type:
                continue

        result.append(item)

    if changed:
        db.commit()

    return result

# GET DETAIL
@router.get("/{advance_id}")
def get_advance(
    advance_id: int,
    db: Session = Depends(get_db)
):
    advance = (

        db.query(AdvanceRequest)

        .filter(
            AdvanceRequest.id == advance_id
        )

        .first()

    )

    if not advance:

        raise HTTPException(
            status_code=404,
            detail="Advance tidak ditemukan"
        )

    update_status(advance)

    db.commit()

    db.refresh(advance)

    return serialize_advance(advance)

# CREATE ADVANCE
@router.post("/")
def create_advance(
    data: AdvanceCreate,
    db: Session = Depends(get_db)
):
    # Employee harus ada
    employee = (
        db.query(Employee)
        .filter(Employee.id == data.employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee tidak ditemukan"
        )

    # Nomor request tidak boleh sama
    exists = (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.request_no == data.request_no
        )
        .first()
    )

    if exists:
        raise HTTPException(
            status_code=400,
            detail="Nomor request sudah digunakan"
        )

    # Deadline tidak boleh sebelum request
    if data.deadline_date < data.request_date:

        raise HTTPException(
            status_code=400,
            detail="Deadline tidak boleh sebelum request date"
        )

    advance = AdvanceRequest(
        request_no=data.request_no,
        employee_id=data.employee_id,
        request_date=data.request_date,
        amount=data.amount,
        purpose=data.purpose,
        deadline_date=data.deadline_date,
        status=AdvanceStatus.ACTIVE
    )

    db.add(advance)
    db.commit()
    db.refresh(advance)
    return serialize_advance(advance)

# UPDATE ADVANCE
@router.put("/{advance_id}")
def update_advance(
    advance_id: int,
    data: AdvanceUpdate,
    db: Session = Depends(get_db)
):

    advance = (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.id == advance_id
        )

        .first()
    )

    if not advance:
        raise HTTPException(
            status_code=404,
            detail="Advance tidak ditemukan"
        )

    update_status(advance)

    # Sudah settled tidak boleh diubah
    if advance.status == AdvanceStatus.SETTLED:

        raise HTTPException(
            status_code=400,
            detail="Advance yang sudah settled tidak dapat diubah"
        )

    if data.amount is not None:

        advance.amount = data.amount

    if data.purpose is not None:

        advance.purpose = data.purpose

    if data.deadline_date is not None:

        if data.deadline_date < advance.request_date:

            raise HTTPException(
                status_code=400,
                detail="Deadline tidak valid"
            )

        advance.deadline_date = data.deadline_date

    update_status(advance)

    db.commit()

    db.refresh(advance)

    return serialize_advance(advance)

# DELETE ADVANCE
@router.delete("/{advance_id}")
def delete_advance(

    advance_id: int,

    db: Session = Depends(get_db)

):

    advance = (

        db.query(AdvanceRequest)

        .filter(
            AdvanceRequest.id == advance_id
        )

        .first()

    )

    if not advance:

        raise HTTPException(
            status_code=404,
            detail="Advance tidak ditemukan"
        )

    update_status(advance)

    # Yang sudah settled tidak boleh dihapus
    if advance.status == AdvanceStatus.SETTLED:

        raise HTTPException(
            status_code=400,
            detail="Advance yang sudah settled tidak dapat dihapus"
        )

    # Kalau sudah ada settlement juga tidak boleh

    if advance.settlement is not None:

        raise HTTPException(
            status_code=400,
            detail="Advance sudah memiliki settlement"
        )

    db.delete(advance)

    db.commit()

    return {
        "message": "Advance berhasil dihapus"
    }

# SETTLEMENT FORM
@router.get("/{advance_id}/settlement-form")
def settlement_form(
    advance_id: int,
    db: Session = Depends(get_db)
):

    advance = (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.id == advance_id
        )
        .first()
    )

    if not advance:
        raise HTTPException(
            status_code=404,
            detail="Advance tidak ditemukan"
        )

    update_status(advance)

    if advance.status == AdvanceStatus.SETTLED:

        raise HTTPException(
            status_code=400,
            detail="Advance sudah settled."
        )

    return {
        "advance_id": advance.id,
        "request_no": advance.request_no,
        "employee_name":
            advance.employee.employee_name,
        "employee_email":
            advance.employee.employee_email,
        "amount": advance.amount,
        "purpose": advance.purpose,
        "deadline_date": advance.deadline_date
    }

# CREATE SETTLEMENT
@router.post("/{advance_id}/settlement")
def create_settlement(
    advance_id: int,
    data: SettlementCreate,
    db: Session = Depends(get_db)
):

    advance = (

        db.query(AdvanceRequest)

        .filter(
            AdvanceRequest.id == advance_id
        )

        .first()

    )

    if not advance:

        raise HTTPException(
            status_code=404,
            detail="Advance tidak ditemukan"
        )

    update_status(advance)

    if advance.status == AdvanceStatus.SETTLED:

        raise HTTPException(
            status_code=400,
            detail="Advance sudah settled"
        )

    settlement = Settlement(
        type=SettlementSource.ADVANCE,
        advance_request_id=advance.id,
        employee_id=advance.employee_id,
        settlement_date=data.settlement_date,
        settlement_amount=data.settlement_amount,
        note=data.note,
        sap_document_no=data.sap_document_no
    )

    db.add(settlement)

    advance.status = AdvanceStatus.SETTLED

    db.commit()

    db.refresh(settlement)

    db.refresh(advance)

    return {

        "message": "Settlement berhasil disimpan",

        "advance": serialize_advance(advance)

    }

# SETTLEMENT RECEIPT
@router.get("/{advance_id}/settlement-receipt")
def settlement_receipt(

    advance_id: int,

    db: Session = Depends(get_db)

):

    advance = (

        db.query(AdvanceRequest)

        .filter(
            AdvanceRequest.id == advance_id
        )

        .first()

    )

    if not advance:

        raise HTTPException(
            status_code=404,
            detail="Advance tidak ditemukan"
        )

    if advance.settlement is None:

        raise HTTPException(
            status_code=404,
            detail="Settlement belum tersedia"
        )

    s = advance.settlement

    return {
        "request_no": advance.request_no,
        "employee_name":
            advance.employee.employee_name,
        "employee_email":
            advance.employee.employee_email,
        "purpose":
            advance.purpose,
        "advance_amount":
            advance.amount,
        "settlement_date":
            s.settlement_date,
        "settlement_amount":
            s.settlement_amount,
        "note":
            s.note,
        "sap_document_no":
            s.sap_document_no,
        "created_at":
            s.created_at
    }
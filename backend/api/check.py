from datetime import date
from typing import Optional
from pydantic import BaseModel
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import (
    PrintedCheck,
    CheckType,
    BankType
)

router = APIRouter(
    prefix="/check",
    tags=["Check"]
)


# schema
class CheckCreate(BaseModel):
    transaction_date:date
    check_number:str
    transaction_type:CheckType
    bank_type:BankType
    vendor_name:str
    amount:float
    vendor_bank:Optional[str]=None
    vendor_account_number:Optional[str]=None

# GET CHECK
@router.get("")
def get_check(

    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),

    transaction_type: Optional[CheckType] = Query(
        None
    ),

    db: Session = Depends(get_db)

):

    query = db.query(
        PrintedCheck
    )

    # filter tanggal
    if start_date:
        query = query.filter(
            PrintedCheck.transaction_date >= start_date
        )

    if end_date:
        query = query.filter(
            PrintedCheck.transaction_date <= end_date
        )

    # filter transaction type
    if transaction_type:
        query = query.filter(
            PrintedCheck.transaction_type ==
            transaction_type
        )

    checks = (
        query
        .order_by(
            PrintedCheck.transaction_date.desc()
        )
        .all()
    )

    results = []

    for item in checks:
        results.append({
            "id": item.id,
            "transaction_date": item.transaction_date,
            "check_number": item.check_number,
            "transaction_type": item.transaction_type.value if item.transaction_type else None,
            "bank_type": item.bank_type.value if item.bank_type else None,
            "vendor_name": item.vendor_name,
            "vendor_bank": item.vendor_bank,
            "vendor_account_number": item.vendor_account_number,
            "amount": item.amount,

            # Legacy key compatibility
            "tanggal": item.transaction_date,
            "nomorCek": item.check_number,
            "jenisCek": item.transaction_type.value if item.transaction_type else None,
            "bank": f"Bank {item.bank_type.value}" if item.bank_type else "",
            "vendor": item.vendor_name,
            "nomorRekening": item.vendor_account_number,
            "nominal": item.amount
        })

    return {
        "total_data": len(results),
        "data": results
    }

# CREATE CHECK
@router.post("")
def create_check(
    payload:CheckCreate,
    db:Session=Depends(get_db)
):
    existing = (
        db.query(
            PrintedCheck
        )
        .filter(
            PrintedCheck.check_number ==
            payload.check_number
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Nomor Check sudah digunakan."
        )

    new_check = PrintedCheck(
        transaction_date=
        payload.transaction_date,
        check_number=
        payload.check_number,
        transaction_type=
        payload.transaction_type,
        bank_type=
        payload.bank_type,
        vendor_name=
        payload.vendor_name,
        amount=
        payload.amount,
        vendor_bank=
        payload.vendor_bank,
        vendor_account_number=
        payload.vendor_account_number
    )

    db.add(
        new_check
    )
    db.commit()
    db.refresh(
        new_check
    )

    return{
        "message":
        "Check berhasil dibuat.",
        "id":
        new_check.id
    }

# DELETE CHECK
@router.delete("/{check_id}")
def delete_check(
    check_id:int,
    db: Session = Depends(get_db)
):

    data = (
        db.query(
            PrintedCheck
        )
        .filter(
            PrintedCheck.id ==
            check_id
        )
        .first()
    )

    if not data:
        raise HTTPException(
            status_code=404,
            detail=
            "Check tidak ditemukan."
        )

    db.delete(
        data
    )
    db.commit()
    return {
        "message":
            "Check berhasil dihapus."
    }

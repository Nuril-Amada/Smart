from datetime import date, datetime
from decimal import Decimal
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
    id: Optional[int] = None
    transaction_date: date
    check_number: str
    transaction_type: CheckType
    bank_type: BankType
    vendor_name: str
    amount: Decimal
    vendor_bank: Optional[str] = None
    vendor_account_number: Optional[str] = None

# GET CHECK
@router.get("")
def get_check(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    transaction_type: Optional[CheckType] = Query(
        None
    ),

    # tambahan untuk autocomplete vendor
    vendor: Optional[str] = Query(None),

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

    # filter vendor (autocomplete)
    if vendor:
        query = query.filter(
            PrintedCheck.vendor_name.ilike(f"%{vendor}%")
        )
        
    checks = (
        query
        .order_by(
            PrintedCheck.updated_at.desc(),
            PrintedCheck.id.desc()
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
            "amount": float(item.amount) if item.amount is not None else None,

            # Legacy key compatibility
            "tanggal": item.transaction_date,
            "nomorCek": item.check_number,
            "jenisCek": item.transaction_type.value if item.transaction_type else None,
            "bank": f"Bank {item.bank_type.value}" if item.bank_type else "",
            "vendor": item.vendor_name,
            "nomorRekening": item.vendor_account_number,
            "nominal": float(item.amount) if item.amount is not None else None
        })

    return {
        "total_data": len(results),
        "data": results
    }

# CREATE / UPDATE CHECK
@router.post("")
def create_check(
    payload: CheckCreate,
    db: Session = Depends(get_db)
):
    if payload.id is not None:
        # Edit mode (user clicked Edit button on existing row)
        existing = db.query(PrintedCheck).filter(PrintedCheck.id == payload.id).first()
        if not existing:
            raise HTTPException(status_code=404, detail="Data cek tidak ditemukan.")
        
        # Check if new check_number belongs to another record
        duplicate = db.query(PrintedCheck).filter(
            PrintedCheck.check_number == payload.check_number,
            PrintedCheck.id != payload.id
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=400,
                detail=f"Nomor cek '{payload.check_number}' sudah pernah digunakan oleh data lain."
            )

        existing.transaction_date = payload.transaction_date
        existing.check_number = payload.check_number
        existing.transaction_type = payload.transaction_type
        existing.bank_type = payload.bank_type
        existing.vendor_name = payload.vendor_name
        existing.amount = payload.amount
        existing.vendor_bank = payload.vendor_bank
        existing.vendor_account_number = payload.vendor_account_number
        existing.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(existing)

        return {
            "message": "Data cek berhasil diperbarui.",
            "id": existing.id,
            "is_update": True
        }
    else:
        # Create mode (new check form submission)
        existing = db.query(PrintedCheck).filter(PrintedCheck.check_number == payload.check_number).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Nomor cek '{payload.check_number}' sudah pernah digunakan. Ganti nomor cek atau klik tombol Edit pada data yang ada."
            )

        new_check = PrintedCheck(
            transaction_date=payload.transaction_date,
            check_number=payload.check_number,
            transaction_type=payload.transaction_type,
            bank_type=payload.bank_type,
            vendor_name=payload.vendor_name,
            amount=payload.amount,
            vendor_bank=payload.vendor_bank,
            vendor_account_number=payload.vendor_account_number
        )

        db.add(new_check)
        db.commit()
        db.refresh(new_check)

        return {
            "message": "Data cek berhasil disimpan.",
            "id": new_check.id,
            "is_update": False
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
            "Cek tidak ditemukan."
        )

    db.delete(
        data
    )
    db.commit()
    return {
        "message":
            "Cek berhasil dihapus."
    }

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request
)

from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import (
    Vendor
)

router = APIRouter(
    prefix="/vendor",
    tags=["Vendor"]
)

# GET ALL VENDOR
@router.get("")
def get_vendor(
    search:str = Query(""),
    db:Session = Depends(get_db)
):

    query = db.query(
        Vendor
    )

    if search:
        query = query.filter(
            Vendor.vendor_name.ilike(
                f"%{search}%"
            )
        )

    vendors = (
        query
        .order_by(
            Vendor.vendor_name.asc()
        )
        .all()
    )

    results = []
    for vendor in vendors:
        results.append({
            "id":vendor.id,
            "vendor_name":vendor.vendor_name,
            "bank_name":vendor.bank_name,
            "bank_account_name":vendor.bank_account_name,
            "bank_account_no":vendor.bank_account_no
        })

    return{
        "total_data":len(results),
        "data":results
    }

# GET DETAIL VENDOR
@router.get("/{vendor_id}")
def get_vendor_detail(
    vendor_id: int,
    db: Session = Depends(get_db)
):

    vendor = (
        db.query(
            Vendor
        )
        .filter(
            Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor tidak ditemukan."
        )

    return {
        "id":vendor.id,
        "vendor_name":vendor.vendor_name,
        "bank_name":vendor.bank_name,
        "bank_account_name":vendor.bank_account_name,
        "bank_account_no":vendor.bank_account_no
    }

# CREATE VENDOR
@router.post("")
async def create_vendor(
    request:Request,
    db:Session = Depends(get_db)
):

    payload = await request.json()
    vendor_name = payload.get(
        "vendor_name",
        ""
    ).strip()

    bank_name = payload.get(
        "bank_name",
        ""
    ).strip()

    bank_account_name = payload.get(
        "bank_account_name",
        ""
    ).strip()

    bank_account_no = payload.get(
        "bank_account_no",
        ""
    ).strip()

    if (
        not vendor_name
        or not bank_name
        or not bank_account_name
        or not bank_account_no
    ):

        raise HTTPException(
            status_code=400,
            detail=
            "Semua field wajib diisi."
        )

    existing_vendor = (
        db.query(
            Vendor
        )
        .filter(
            Vendor.bank_account_no
            ==
            bank_account_no
        )
        .first()
    )

    if existing_vendor:
        raise HTTPException(
            status_code=400,
            detail=
            "Nomor rekening sudah digunakan."
        )

    vendor = Vendor(
        vendor_name=vendor_name,
        bank_name=bank_name,
        bank_account_name=bank_account_name,
        bank_account_no=bank_account_no
    )

    db.add(vendor)
    db.commit()
    db.refresh(vendor)

    return{
        "message":
        "Vendor berhasil ditambahkan.",
        "data":{
            "id":vendor.id,
            "vendor_name":vendor.vendor_name,
            "bank_name":vendor.bank_name,
            "bank_account_name":vendor.bank_account_name,
            "bank_account_no":vendor.bank_account_no
        }
    }

# DELETE VENDOR
@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db)
):

    vendor = (
        db.query(Vendor)
        .filter(
            Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail=
            "Vendor tidak ditemukan."
        )

    db.delete(vendor)
    db.commit()

    return {
        "message":
        "Vendor berhasil dihapus."
    }

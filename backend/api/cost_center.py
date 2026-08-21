from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)

from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database.connection import get_db
from database.models import CostCenter


router = APIRouter(
    prefix="/cost-center",
    tags=["Cost Center"]
)

# REQUEST SCHEMA
class CostCenterCreate(BaseModel):
    cost_center_code: str
    cost_center_name: str


# GET ALL COST CENTER + SEARCH

@router.get("/")
def get_all_cost_center(
    search: str = Query(
        default=None
    ),
    db: Session = Depends(
        get_db
    )
):

    query = db.query(CostCenter)

    if search:
        search_value = search.strip().lower()

        query = query.filter(
            or_(
                func.lower(
                    CostCenter.cost_center_code
                ).contains(
                    search_value
                ),
                func.lower(
                    CostCenter.cost_center_name
                ).contains(
                    search_value
                )
            )
        )

    cost_centers = (
        query
        .order_by(
            CostCenter.cost_center_code.asc()
        )
        .all()
    )

    return cost_centers


# CREATE COST CENTER
@router.post("/")
def create_cost_center(
    cost_center: CostCenterCreate,
    db: Session = Depends(
        get_db
    )
):

    code = cost_center.cost_center_code.strip()
    name = cost_center.cost_center_name.strip()

    if not code or not name:
        raise HTTPException(
            status_code=400,
            detail="Kode dan nama Cost Center wajib diisi."
        )

    # Cek duplicate kode Cost Center
    existing_cost_center = (
        db.query(CostCenter)
        .filter(
            func.lower(
                CostCenter.cost_center_code
            )
            ==
            code.lower()
        )
        .first()
    )

    if existing_cost_center:
        raise HTTPException(
            status_code=400,
            detail="Kode Cost Center sudah ada."
        )

    new_cost_center = CostCenter(
        cost_center_code=code,
        cost_center_name=name
    )

    db.add(new_cost_center)
    db.commit()
    db.refresh(new_cost_center)

    return {
        "message": "Cost Center berhasil ditambahkan.",
        "data": new_cost_center
    }

# DELETE COST CENTER
@router.delete("/{id}")
def delete_cost_center(
    id: int,
    db: Session = Depends(
        get_db
    )
):

    cost_center = (
        db.query(CostCenter)
        .filter(
            CostCenter.id == id
        )
        .first()
    )

    if not cost_center:
        raise HTTPException(
            status_code=404,
            detail="Cost Center tidak ditemukan."
        )

    db.delete(cost_center)
    db.commit()

    return {
        "message": "Cost Center berhasil dihapus."
    }
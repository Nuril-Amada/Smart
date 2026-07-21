from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.connection import get_db
from database.models import Employee


router = APIRouter(
    prefix="/employees",
    tags=["Employee"]
)


# ==========================================================
# GET ALL EMPLOYEE
# ==========================================================
@router.get("/")
def get_all_employees(
    db: Session = Depends(get_db)
):

    employees = (

        db.query(Employee)
        .order_by(Employee.employee_name.asc())
        .all()

    )

    return employees


# ==========================================================
# GET EMPLOYEE BY ID
# ==========================================================
@router.get("/{id}")
def get_employee_by_id(
    id: int,
    db: Session = Depends(get_db)
):

    employee = (

        db.query(Employee)
        .filter(Employee.id == id)
        .first()

    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee tidak ditemukan."
        )

    return employee


# ==========================================================
# SEARCH EMPLOYEE
# ==========================================================
@router.get("/search/")
def search_employee(
    keyword: str = Query(...),
    limit: int = 10,
    db: Session = Depends(get_db)
):

    employees = (

        db.query(Employee)
        .filter(
            func.lower(Employee.employee_name)
            .contains(keyword.lower())
        )
        .order_by(Employee.employee_name.asc())
        .limit(limit)
        .all()

    )

    return employees
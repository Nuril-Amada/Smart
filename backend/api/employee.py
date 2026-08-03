from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.models import Employee

router = APIRouter(
    prefix="/employees",
    tags=["Employee"]
)

# REQUEST SCHEMA
class EmployeeCreate(BaseModel):
    employee_name: str
    employee_email: str
    department_email: Optional[str] = None

# GET ALL EMPLOYEE + SEARCH
@router.get("/")
def get_all_employee(

    search: str = Query(
        default=None
    ),

    db: Session = Depends(
        get_db
    )

):

    query = db.query(Employee)

    # search berdasarkan nama employee
    if search:
        query = (
            query.filter(
                func.lower(
                    Employee.employee_name
                ).contains(
                    search.lower()
                )
            )
        )

    employees = (
        query
        .order_by(Employee.id.desc())
        .all()

    )

    return employees

# CREATE EMPLOYEE
@router.post("/")
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(
        get_db
    )
):
    # normalisasi data
    employee_name = (
        employee.employee_name
        .strip()
        .upper()
    )

    employee_email = (
        employee.employee_email
        .strip()
        .lower()
    )

    department_email = (
        employee.department_email
        .strip()
        .lower()
        if employee.department_email
        else None
    )

    # cek duplicate employee
    existing_employee = (
        db.query(Employee)
        .filter(
            Employee.employee_name
            ==
            employee_name
        )
        .first()
    )

    if existing_employee:
        raise HTTPException(
            status_code=400,
            detail=
                "Employee sudah ada."
        )

    # insert data
    new_employee = Employee(
        employee_name=
            employee_name,
        employee_email=
            employee_email,
        department_email=
            department_email
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return {
        "message":
            "Employee berhasil ditambahkan.",

        "data":
            new_employee
    }

# DELETE EMPLOYEE
@router.delete("/{id}")
def delete_employee(
    id: int,
    db: Session = Depends(
        get_db
    )
):

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail=(
                "Employee tidak ditemukan."
            )
        )

    db.delete(employee)
    db.commit()

    return {
        "message":
            "Employee berhasil dihapus."
    }
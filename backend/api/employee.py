from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database.connection import SessionLocal
from database.models import Employee

router = APIRouter(
    prefix="/employees",
    tags=["Employee"]
)


# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Pydantic Schema
class EmployeeCreate(BaseModel):
    employee_id: str
    employee_name: str
    employee_email: EmailStr


class EmployeeUpdate(BaseModel):
    employee_name: str
    employee_email: EmailStr


# GET ALL
@router.get("/")
def get_all_employees(db: Session = Depends(get_db)):
    return db.query(Employee).all()


# GET BY ID
@router.get("/{id}")
def get_employee(id: int, db: Session = Depends(get_db)):

    employee = db.query(Employee).filter(Employee.id == id).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return employee

# CREATE
@router.post("/")
def create_employee(data: EmployeeCreate,
                    db: Session = Depends(get_db)):

    existing = db.query(Employee).filter(
        Employee.employee_id == data.employee_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Employee ID already exists"
        )

    employee = Employee(
        employee_id=data.employee_id,
        employee_name=data.employee_name,
        employee_email=data.employee_email
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee


# UPDATE
@router.put("/{id}")
def update_employee(
        id: int,
        data: EmployeeUpdate,
        db: Session = Depends(get_db)):

    employee = db.query(Employee).filter(
        Employee.id == id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    employee.employee_name = data.employee_name
    employee.employee_email = data.employee_email

    db.commit()
    db.refresh(employee)

    return employee


# DELETE
@router.delete("/{id}")
def delete_employee(
        id: int,
        db: Session = Depends(get_db)):

    employee = db.query(Employee).filter(
        Employee.id == id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    db.delete(employee)
    db.commit()

    return {
        "message": "Employee deleted successfully"
    }
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from database.connection import get_db
from database.models import GlAccount

router = APIRouter(
    prefix="/gl-account",
    tags=["GL Account"]
)

# =====================================================
# Pydantic Schema
# =====================================================

class GlAccountCreate(BaseModel):
    gl_account: str
    nama_gl_account: str


class GlAccountUpdate(BaseModel):
    nama_gl_account: str


# =====================================================
# GET ALL GL ACCOUNT
# =====================================================

@router.get("/")
def get_gl_accounts(
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):

    query = db.query(GlAccount)

    if search:
        query = query.filter(
            or_(
                GlAccount.gl_account.ilike(f"%{search}%"),
                GlAccount.nama_gl_account.ilike(f"%{search}%")
            )
        )

    total = query.count()

    data = (
        query.order_by(GlAccount.gl_account)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "page": page,
        "page_size": page_size,
        "total_data": total,
        "total_page": (total + page_size - 1) // page_size,
        "data": data
    }


# =====================================================
# GET DETAIL
# =====================================================

@router.get("/{id}")
def get_gl_account(
    id: int,
    db: Session = Depends(get_db)
):

    gl = db.query(GlAccount).filter(
        GlAccount.id == id
    ).first()

    if not gl:
        raise HTTPException(
            status_code=404,
            detail="GL Account not found"
        )

    return gl


# =====================================================
# CREATE
# =====================================================

@router.post("/")
def create_gl_account(
    payload: GlAccountCreate,
    db: Session = Depends(get_db)
):

    exists = db.query(GlAccount).filter(
        GlAccount.gl_account == payload.gl_account
    ).first()

    if exists:
        raise HTTPException(
            status_code=400,
            detail="GL Account already exists"
        )

    gl = GlAccount(
        gl_account=payload.gl_account.strip(),
        nama_gl_account=payload.nama_gl_account.strip()
    )

    db.add(gl)
    db.commit()
    db.refresh(gl)

    return {
        "message": "GL Account created successfully",
        "data": gl
    }


# =====================================================
# UPDATE
# =====================================================

@router.put("/{id}")
def update_gl_account(
    id: int,
    payload: GlAccountUpdate,
    db: Session = Depends(get_db)
):

    gl = db.query(GlAccount).filter(
        GlAccount.id == id
    ).first()

    if not gl:
        raise HTTPException(
            status_code=404,
            detail="GL Account not found"
        )

    gl.nama_gl_account = payload.nama_gl_account.strip()

    db.commit()
    db.refresh(gl)

    return {
        "message": "GL Account updated successfully",
        "data": gl
    }

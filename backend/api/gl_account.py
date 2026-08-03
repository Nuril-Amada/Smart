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
from database.models import GlAccount


router = APIRouter(
    prefix="/gl-account",
    tags=["GL Account"]
)

# REQUEST SCHEMA
class GlAccountCreate(BaseModel):
    gl_account: str
    nama_gl_account: str

# GET ALL GL ACCOUNT + SEARCH
@router.get("/")
def get_all_gl_account(
    search: str = Query(
        default=None
    ),

    db: Session = Depends(
        get_db
    )
):

    query = db.query(GlAccount)
    # search nomor/nama gl account
    if search:
        query = (
            query.filter(
                or_(
                    func.lower(
                        GlAccount.gl_account
                    ).contains(
                        search.lower()
                    ),
                    func.lower(
                        GlAccount.nama_gl_account
                    ).contains(
                        search.lower()
                    )
                )
            )
        )

    gl_accounts = (
        query
        .order_by(
            GlAccount.gl_account.asc()
        )
        .all()
    )
    return gl_accounts

# CREATE GL ACCOUNT
@router.post("/")
def create_gl_account(
    gl_account: GlAccountCreate,
    db: Session = Depends(
        get_db
    )
):
    # cek duplicate nomor GL
    existing_gl = (
        db.query(GlAccount)
        .filter(
            func.lower(
                GlAccount.gl_account
            )
            ==
            gl_account.gl_account.lower()
        )
        .first()
    )

    if existing_gl:
        raise HTTPException(
            status_code=400,
            detail=(
                "GL Account sudah ada."
            )
        )

    new_gl_account = GlAccount(
        gl_account=
            gl_account.gl_account.strip(),
        nama_gl_account=
            gl_account.nama_gl_account.strip().title()
    )

    db.add(new_gl_account)
    db.commit()
    db.refresh(new_gl_account)

    return {
        "message":
            "GL Account berhasil ditambahkan.",
        "data":
            new_gl_account
    }

# DELETE GL ACCOUNT
@router.delete("/{id}")
def delete_gl_account(
    id: int,
    db: Session = Depends(
        get_db
    )
):

    gl_account = (
        db.query(GlAccount)
        .filter(
            GlAccount.id == id
        )
        .first()
    )

    if not gl_account:
        raise HTTPException(
            status_code=404,
            detail=(
                "GL Account tidak ditemukan."
            )
        )

    db.delete(gl_account)
    db.commit()

    return {
        "message":
            "GL Account berhasil dihapus."
    }
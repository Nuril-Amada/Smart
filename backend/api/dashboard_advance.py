from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, Query
from database.connection import get_db
from database.models import (
    AdvanceRequest,
    AdvanceStatus,
    AdvanceType,
)

router = APIRouter(
    prefix="/dashboard/advance",
    tags=["Dashboard Advance"]
)


# FILTER
def apply_filter(
    query: Query,
    advance_type: Optional[AdvanceType] = None,
    status: Optional[AdvanceStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    if advance_type:
        query = query.filter(
            AdvanceRequest.advance_type == advance_type
        )
    if status:
        query = query.filter(
            AdvanceRequest.status == status
        )
    if start_date:
        query = query.filter(
            AdvanceRequest.request_date >= start_date
        )
    if end_date:
        query = query.filter(
            AdvanceRequest.request_date <= end_date
        )
    return query

# SUMMARY CARD
@router.get("/summary")
def advance_summary(
    advance_type: Optional[AdvanceType] = None,
    status: Optional[AdvanceStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = db.query(AdvanceRequest)
    query = apply_filter(
        query=query,
        advance_type=advance_type,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )

    data = query.all()

    return {
        "total_advance": len(data),
        "active_advance": sum(
            1
            for x in data
            if x.status == AdvanceStatus.ACTIVE
        ),
        "overdue_advance": sum(
            1
            for x in data
            if x.status == AdvanceStatus.OVERDUE
        ),
        "settled_advance": sum(
            1
            for x in data
            if x.status == AdvanceStatus.SETTLED
        ),
        "total_amount": sum(
            x.amount
            for x in data
        ),
        "ppc_count": sum(
            1
            for x in data
            if x.advance_type == AdvanceType.PPC
        ),
        "pam_count": sum(
            1
            for x in data
            if x.advance_type == AdvanceType.PAM
        )
    }

# TABLE PPC (<= 1 JUTA)
@router.get("/ppc")
def ppc_list(
    status: Optional[AdvanceStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = db.query(AdvanceRequest)

    query = apply_filter(
        query=query,
        advance_type=AdvanceType.PPC,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )

    advances = (

        query

        .order_by(
            AdvanceRequest.request_date.desc()
        )
        .all()
    )

    return [
        {
            "id": adv.id,
            "request_no": adv.request_no,
            "request_date": adv.request_date,
            "employee_name": (
                adv.employee.employee_name
                if adv.employee
                else None
            ),
            "employee_email": (
                adv.employee.employee_email
                if adv.employee
                else None
            ),
            "cost_center": adv.cost_center,
            "purpose": adv.purpose,
            "amount": adv.amount,
            "deadline_date": adv.deadline_date,
            "status": adv.status.value,
            "has_settlement": (
                adv.settlement is not None
            )
        }

        for adv in advances
    ]

# TABLE PAM (> 1 JUTA)
@router.get("/pam")
def pam_list(
    status: Optional[AdvanceStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = db.query(AdvanceRequest)

    query = apply_filter(
        query=query,
        advance_type=AdvanceType.PAM,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )

    advances = (

        query

        .order_by(
            AdvanceRequest.request_date.desc()
        )

        .all()

    )

    result = []

    for adv in advances:

        total_pengajuan = (

            db.query(AdvanceRequest)

            .filter(

                AdvanceRequest.advance_type == AdvanceType.PAM,

                AdvanceRequest.cost_center == adv.cost_center

            )

            .count()

        )

        result.append({
            "id": adv.id,
            "request_no": adv.request_no,
            "request_date": adv.request_date,
            "employee_name": (
                adv.employee.employee_name
                if adv.employee
                else None
            ),

            "cost_center": adv.cost_center,
            "purpose": adv.purpose,
            "amount": adv.amount,
            "deadline_date": adv.deadline_date,
            "status": adv.status.value,
            "submission_count": total_pengajuan,
            "limit_reached": total_pengajuan >= 2

        })
    return result

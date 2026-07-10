from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database.connection import get_db
from database.models import (
    Settlement,
    SettlementSource,
)

router = APIRouter(
    prefix="/dashboard/settlement",
    tags=["Dashboard Settlement"]
)

# FILTER
def apply_filter(
    query,
    source: Optional[SettlementSource] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):

    if source:
        query = query.filter(
            Settlement.type == source
        )

    if start_date:
        query = query.filter(
            Settlement.settlement_date >= start_date
        )

    if end_date:
        query = query.filter(
            Settlement.settlement_date <= end_date
        )
    return query

# SUMMARY CARD
@router.get("/summary")
def settlement_summary(
    source: Optional[SettlementSource] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = db.query(Settlement)

    query = apply_filter(
        query=query,
        source=source,
        start_date=start_date,
        end_date=end_date,
    )

    data = query.all()

    return {
        "total_settlement": len(data),
        "advance": sum(
            1
            for x in data
            if x.type == SettlementSource.ADVANCE
        ),
        "reimbursement": sum(
            1
            for x in data
            if x.type == SettlementSource.REIMBURSEMENT
        ),
        "total_amount": sum(
            x.settlement_amount
            for x in data
        )
    }

# TABLE SETTLEMENT
@router.get("/list")
def settlement_list(
    source: Optional[SettlementSource] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)

):

    query = db.query(Settlement)
    query = apply_filter(
        query=query,
        source=source,
        start_date=start_date,
        end_date=end_date,
    )

    settlements = (

        query

        .order_by(
            Settlement.settlement_date.desc()
        )

        .all()

    )

    result = []

    for item in settlements:

        employee = item.employee
        advance = item.advance_request

        result.append({

            "id": item.id,

            "settlement_date": item.settlement_date,

            "request_no":
                advance.request_no
                if advance
                else "-",

            "employee_name":
                employee.employee_name
                if employee
                else None,

            "employee_email":
                employee.employee_email
                if employee
                else None,

            "cost_center":
                advance.cost_center
                if advance
                else None,

            "purpose":
                advance.purpose
                if advance
                else item.note,

            "amount":
                item.settlement_amount,

            "source":
                item.type.value,

            "note":
                item.note

        })

    return result

# # =====================================================
# # TREND SETTLEMENT
# # =====================================================

# @router.get("/trend")
# def settlement_trend(

#     source: Optional[SettlementSource] = None,

#     start_date: Optional[date] = None,

#     end_date: Optional[date] = None,

#     db: Session = Depends(get_db)

# ):

#     query = db.query(

#         extract(
#             "year",
#             Settlement.settlement_date
#         ).label("year"),

#         extract(
#             "month",
#             Settlement.settlement_date
#         ).label("month"),

#         func.count(
#             Settlement.id
#         ).label("total_settlement"),

#         func.sum(
#             Settlement.settlement_amount
#         ).label("total_amount")

#     )

#     if source:

#         query = query.filter(
#             Settlement.type == source
#         )

#     if start_date:

#         query = query.filter(
#             Settlement.settlement_date >= start_date
#         )

#     if end_date:

#         query = query.filter(
#             Settlement.settlement_date <= end_date
#         )

#     result = (

#         query

#         .group_by(

#             extract(
#                 "year",
#                 Settlement.settlement_date
#             ),

#             extract(
#                 "month",
#                 Settlement.settlement_date
#             )

#         )

#         .order_by(

#             extract(
#                 "year",
#                 Settlement.settlement_date
#             ),

#             extract(
#                 "month",
#                 Settlement.settlement_date
#             )

#         )

#         .all()

#     )

#     return [

#         {

#             "period":
#                 f"{int(row.year)}-{int(row.month):02}",

#             "total_settlement":
#                 int(row.total_settlement),

#             "total_amount":
#                 float(row.total_amount or 0)

#         }

#         for row in result

#     ]
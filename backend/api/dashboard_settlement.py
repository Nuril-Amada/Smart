# from datetime import date
# from typing import Optional
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from sqlalchemy import func, extract
# from database.connection import get_db
# from database.models import (
#     Settlement,
#     SettlementSource,
# )

# router = APIRouter(
#     prefix="/dashboard/settlement",
#     tags=["Dashboard Settlement"]
# )

# # FILTER
# def apply_filter(
#     query,
#     source: Optional[SettlementSource] = None,
#     start_date: Optional[date] = None,
#     end_date: Optional[date] = None,
# ):

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
#     return query

# # SUMMARY CARD
# @router.get("/summary")
# def settlement_summary(
#     source: Optional[SettlementSource] = None,
#     start_date: Optional[date] = None,
#     end_date: Optional[date] = None,
#     db: Session = Depends(get_db)
# ):

#     query = db.query(Settlement)

#     query = apply_filter(
#         query=query,
#         source=source,
#         start_date=start_date,
#         end_date=end_date,
#     )

#     data = query.all()

#     return {
#         "total_settlement": len(data),
#         "advance": sum(
#             1
#             for x in data
#             if x.type == SettlementSource.ADVANCE
#         ),
#         "reimbursement": sum(
#             1
#             for x in data
#             if x.type == SettlementSource.REIMBURSEMENT
#         ),
#         "total_amount": sum(
#             x.settlement_amount
#             for x in data
#         )
#     }

# # TABLE SETTLEMENT
# @router.get("/list")
# def settlement_list(
#     source: Optional[SettlementSource] = None,
#     start_date: Optional[date] = None,
#     end_date: Optional[date] = None,
#     db: Session = Depends(get_db)

# ):

#     query = db.query(Settlement)
#     query = apply_filter(
#         query=query,
#         source=source,
#         start_date=start_date,
#         end_date=end_date,
#     )

#     settlements = (

#         query

#         .order_by(
#             Settlement.settlement_date.desc()
#         )

#         .all()

#     )

#     result = []

#     for item in settlements:

#         employee = item.employee
#         advance = item.advance_request

#         result.append({

#             "id": item.id,

#             "settlement_date": item.settlement_date,

#             "request_no":
#                 advance.document_no
#                 if advance
#                 else "-",

#             "employee_name":
#                 employee.employee_name
#                 if employee
#                 else None,

#             "employee_email":
#                 employee.employee_email
#                 if employee
#                 else None,

#             "cost_center":
#                 advance.cost_center
#                 if advance
#                 else item.cost_center,

#             "purpose":
#                 advance.purpose
#                 if advance
#                 else item.description,

#             "amount":
#                 item.settlement_amount,

#             "source":
#                 item.source.value,

#             "note":
#                 item.description

#         })

#     return result

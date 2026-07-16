from datetime import date, timedelta
from typing import Optional
from enum import Enum
from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.models import Transaction, GlAccount

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)
class TrendGroup(str, Enum):
    day = "day"
    month = "month"
    year = "year"

# FILTER DATE
def apply_date_filter(query, start_date, end_date):

    if start_date:
        query = query.filter(
            Transaction.posting_date >= start_date
        )

    if end_date:
        query = query.filter(
            Transaction.posting_date <= end_date
        )

    return query

# ====================================================
# SUMMARY CARD
# ====================================================
@router.get("/summary")
def dashboard_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = db.query(Transaction)

    query = apply_date_filter(
        query,
        start_date,
        end_date
    )

    result = query.with_entities(

        func.sum(Transaction.amount),

        func.count(Transaction.id),

        func.count(
            func.distinct(Transaction.gl_account)
        ),

        func.count(
            func.distinct(Transaction.cost_center)
        )

    ).first()

    total_expense = float(result[0] or 0)
    total_transactions = result[1] or 0
    total_gl_accounts = result[2] or 0
    total_cost_centers = result[3] or 0

    # Average Daily Expense (5 Hari Kerja)
    def count_workdays(start, end):
        days = 0
        current = start

        while current <= end:
            # Senin = 0 ... Jumat = 4
            if current.weekday() < 5:
                days += 1
            current += timedelta(days=1)

        return days


    if start_date and end_date:

        total_days = count_workdays(
            start_date,
            end_date
        )

    else:

        first_date = db.query(
            func.min(Transaction.posting_date)
        ).scalar()

        last_date = db.query(
            func.max(Transaction.posting_date)
        ).scalar()

        if first_date and last_date:
            total_days = count_workdays(
                first_date,
                last_date
            )
        else:
            total_days = 1


    average_daily_expense = (
        total_expense / total_days
        if total_days > 0
        else 0
    )

    return {

        "total_expense": total_expense,

        "total_transactions": total_transactions,

        "total_gl_accounts": total_gl_accounts,

        "total_cost_centers": total_cost_centers,

        "average_daily_expense": average_daily_expense

    }

# BAR CHART
# Pengeluaran per GL Account

@router.get("/gl-account")
def expense_per_gl(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = (
        db.query(
            Transaction.gl_account,
            GlAccount.nama_gl_account,
            func.sum(Transaction.amount).label("total_amount")
        )
        .outerjoin(
            GlAccount,
            Transaction.gl_account == GlAccount.gl_account
        )
    )

    query = apply_date_filter(
        query,
        start_date,
        end_date
    )

    result = (
        query
        .group_by(
            Transaction.gl_account,
            GlAccount.nama_gl_account
        )
        .order_by(
            func.sum(Transaction.amount).desc()
        )
        .limit(10)
        .all()
    )

    return [
        {
            "gl_account": r.gl_account,
            # Fallback ke gl_account jika nama belum ada di master data
            "gl_name": r.nama_gl_account or r.gl_account,
            "total_amount": float(r.total_amount)
        }
        for r in result
    ]

# BAR CHART
# Top 10 Pengeluaran per Cost Center
@router.get("/cost-center")
def expense_per_cost_center(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    query = (
        db.query(
            Transaction.cost_center,
            func.sum(Transaction.amount).label("total_amount")
        )
    )

    query = apply_date_filter(
        query,
        start_date,
        end_date
    )

    result = (
        query
        .group_by(
            Transaction.cost_center
        )
        .order_by(
            func.sum(Transaction.amount).desc()
        )
        .limit(10)
        .all()
    )

    return [
        {
            "cost_center": r.cost_center,
            "total_amount": float(r.total_amount)
        }
        for r in result
    ]

# Expense Detail by Top Cost Center
@router.get("/top-cost-center")
def top_cost_center(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    # Cari Cost Center dengan total expense terbesar

    cost_center_query = (
        db.query(
            Transaction.cost_center,
            func.sum(Transaction.amount).label("total_cost_center")
        )
    )

    cost_center_query = apply_date_filter(
        cost_center_query,
        start_date,
        end_date
    )

    top_cc = (
        cost_center_query
        .group_by(Transaction.cost_center)
        .order_by(func.sum(Transaction.amount).desc())
        .first()
    )

    if top_cc is None:
        return {
            "cost_center": None,
            "total_cost_center": 0,
            "details": []
        }

    # Ambil seluruh GL Account pada Cost Center tersebut

    detail_query = (
        db.query(
            Transaction.gl_account,
            GlAccount.nama_gl_account,
            func.sum(Transaction.amount).label("total_amount")
        )
        .outerjoin(
            GlAccount,
            Transaction.gl_account == GlAccount.gl_account
        )
        .filter(
            Transaction.cost_center == top_cc.cost_center
        )
    )

    detail_query = apply_date_filter(
        detail_query,
        start_date,
        end_date
    )

    details = (
        detail_query
        .group_by(
            Transaction.gl_account,
            GlAccount.nama_gl_account
        )
        .order_by(
            func.sum(Transaction.amount).desc()
        )
        .all()
    )

    return {
        "cost_center": top_cc.cost_center,
        "total_cost_center": float(top_cc.total_cost_center),
        "details": [
            {
                "gl_account": row.gl_account,
                # Fallback ke gl_account jika nama belum ada di master data
                "gl_name": row.nama_gl_account or row.gl_account,
                "total_amount": float(row.total_amount)
            }
            for row in details
        ]
    }

# LINE CHART
@router.get("/trend")
def trend_pengeluaran(
    group_by: TrendGroup = TrendGroup.month,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    # ==========================
    # TREND HARIAN
    # ==========================

    if group_by == TrendGroup.day:

        query = db.query(
            func.date(Transaction.posting_date).label("periode"),
            func.sum(Transaction.amount).label("total_amount")
        )


        query = apply_date_filter(
            query,
            start_date,
            end_date
        )


        result = (
            query
            .group_by(
                func.date(Transaction.posting_date)
            )
            .order_by(
                func.date(Transaction.posting_date)
            )
            .all()
        )


        return [
            {
                "period": str(row.periode),
                "total_amount": float(row.total_amount)
            }
            for row in result
        ]


    # ==========================
    # TREND BULANAN
    # ==========================

    elif group_by == TrendGroup.month:

        query = db.query(
            Transaction.year.label("year"),
            Transaction.month.label("month"),
            func.sum(Transaction.amount).label("total_amount")
        )


        query = apply_date_filter(
            query,
            start_date,
            end_date
        )


        result = (
            query
            .group_by(
                Transaction.year,
                Transaction.month
            )
            .order_by(
                Transaction.year,
                Transaction.month
            )
            .all()
        )


        return [
            {
                "period": f"{row.year}-{str(row.month).zfill(2)}",
                "total_amount": float(row.total_amount)
            }
            for row in result
        ]


    # ==========================
    # TREND TAHUNAN
    # ==========================
    elif group_by == TrendGroup.year:

        query = db.query(
            Transaction.year.label("year"),
            func.sum(Transaction.amount).label("total_amount")
        )


        query = apply_date_filter(
            query,
            start_date,
            end_date
        )


        result = (
            query
            .group_by(
                Transaction.year
            )
            .order_by(
                Transaction.year
            )
            .all()
        )


        return [
            {
                "period": str(row.year),
                "total_amount": float(row.total_amount)
            }
            for row in result
        ]
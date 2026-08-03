from datetime import date, timedelta
from typing import Optional
from enum import Enum
import calendar
from fastapi import (
    APIRouter,
    Depends
)
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.models import (
    Transaction,
    TransactionPerak,
    GlAccount
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

class TrendGroup(str, Enum):
    day = "day"
    month = "month"
    year = "year"

class DashboardSource(str, Enum):
    rungkut = "rungkut"
    perak = "perak"

def get_transaction_model(
        source: DashboardSource
):
    if source == DashboardSource.perak:
        return TransactionPerak

    return Transaction

# FILTER DATE
def apply_date_filter(query, model, start_date, end_date):
    if start_date:
        query = query.filter(
            model.posting_date >= start_date
        )
    if end_date:
        query = query.filter(
            model.posting_date <= end_date
        )
    return query

# SUMMARY CARD
@router.get("/summary")
def dashboard_summary(
    source: DashboardSource = DashboardSource.rungkut,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):

    TransactionModel = get_transaction_model(source)

    query = db.query(
        TransactionModel
    )

    query = apply_date_filter(
        query,
        TransactionModel,
        start_date,
        end_date
    )

    result = query.with_entities(
        func.sum(TransactionModel.amount),
        func.count(TransactionModel.id),
        func.count(
            func.distinct(
                TransactionModel.gl_account
            )
        ),
        func.count(
            func.distinct(
                TransactionModel.cost_center
            )
        )
    ).first()

    total_expense = float(result[0] or 0)
    total_transactions = result[1] or 0
    total_gl_accounts = result[2] or 0
    total_cost_centers = result[3] or 0

    # Average Daily Expense (Hari Kerja)
    def count_workdays(start, end):
        days = 0
        current = start

        while current <= end:
            # Senin = 0 ... Jumat = 4
            if current.weekday() < 5:
                days += 1

            current += timedelta(days=1)

        return days

    # Jika user melakukan filter tanggal
    if start_date and end_date:

        total_days = count_workdays(
            start_date,
            end_date
        )

    # Jika tidak ada filter
    else:

        # Ambil tanggal transaksi terakhir
        latest_date = db.query(
            func.max(
                TransactionModel.posting_date
            )
        ).scalar()

        if latest_date:

            # Awal bulan
            first_date = date(
                latest_date.year,
                latest_date.month,
                1
            )

            # Akhir bulan
            last_day = calendar.monthrange(
                latest_date.year,
                latest_date.month
            )[1]

            last_date = date(
                latest_date.year,
                latest_date.month,
                last_day
            )

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
    source: DashboardSource = DashboardSource.rungkut,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    TransactionModel = get_transaction_model(source)
    query = (
        db.query(
            TransactionModel.gl_account,
            GlAccount.nama_gl_account,
            func.sum(TransactionModel.amount).label("total_amount")
        )
        .outerjoin(
            GlAccount,
            TransactionModel.gl_account == GlAccount.gl_account
        )
    )

    query = apply_date_filter(
            query,
            TransactionModel,
            start_date,
            end_date
    )

    result = (
        query
        .group_by(
            TransactionModel.gl_account,
            GlAccount.nama_gl_account
        )
        .order_by(
            func.sum(TransactionModel.amount).desc()
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
    source: DashboardSource = DashboardSource.rungkut,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    TransactionModel = get_transaction_model(source)
    query = (
        db.query(
            TransactionModel.cost_center,
            func.sum(TransactionModel.amount).label("total_amount")
        )
    )

    query = apply_date_filter(
            query,
            TransactionModel,
            start_date,
            end_date
    )

    result = (
        query
        .group_by(
            TransactionModel.cost_center
        )
        .order_by(
            func.sum(TransactionModel.amount).desc()
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
    source: DashboardSource = DashboardSource.rungkut,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    TransactionModel = get_transaction_model(source)
    # Cari Cost Center dengan total expense terbesar
    cost_center_query = (
        db.query(
            TransactionModel.cost_center,
            func.sum(TransactionModel.amount).label("total_cost_center")
        )
    )

    cost_center_query = apply_date_filter(
        cost_center_query,
        TransactionModel,
        start_date,
        end_date
    )

    top_cc = (
        cost_center_query
        .group_by(TransactionModel.cost_center)
        .order_by(func.sum(TransactionModel.amount).desc())
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
            TransactionModel.gl_account,
            GlAccount.nama_gl_account,
            func.sum(TransactionModel.amount).label("total_amount")
        )
        .outerjoin(
            GlAccount,
            TransactionModel.gl_account == GlAccount.gl_account
        )
        .filter(
            TransactionModel.cost_center == top_cc.cost_center
        )
    )

    detail_query = apply_date_filter(
        detail_query,
        TransactionModel,
        start_date,
        end_date
    )

    details = (
            detail_query
            .group_by(
                TransactionModel.gl_account,
                GlAccount.nama_gl_account
            )
            .order_by(
                func.sum(
                    TransactionModel.amount
                ).desc()
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
    source: DashboardSource = DashboardSource.rungkut,
    group_by: TrendGroup = TrendGroup.month,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    
    TransactionModel = get_transaction_model(source)
    # TREND HARIAN
    if group_by == TrendGroup.day:

        query = db.query(
            func.date(TransactionModel.posting_date).label("periode"),
            func.sum(TransactionModel.amount).label("total_amount")
        )


        query = apply_date_filter(
            query,
            TransactionModel,
            start_date,
            end_date
        )


        result = (
            query
            .group_by(
                func.date(TransactionModel.posting_date)
            )
            .order_by(
                func.date(TransactionModel.posting_date)
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


    # TREND BULANAN
    elif group_by == TrendGroup.month:

        query = db.query(
            TransactionModel.year.label("year"),
            TransactionModel.month.label("month"),
            func.sum(TransactionModel.amount).label("total_amount")
        )


        query = apply_date_filter(
            query,
            TransactionModel,
            start_date,
            end_date
        )


        result = (
            query
            .group_by(
                TransactionModel.year,
                TransactionModel.month
            )
            .order_by(
                TransactionModel.year,
                TransactionModel.month
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


    # TREND TAHUNAN
    elif group_by == TrendGroup.year:

        query = db.query(
            TransactionModel.year.label("year"),
            func.sum(TransactionModel.amount).label("total_amount")
        )


        query = apply_date_filter(
            query,
            TransactionModel,
            start_date,
            end_date
        )


        result = (
            query
            .group_by(
                TransactionModel.year
            )
            .order_by(
                TransactionModel.year
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
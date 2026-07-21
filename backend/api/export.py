import io
from io import BytesIO
from datetime import date, datetime, timedelta
from typing import Optional
import pandas as pd
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from database.connection import get_db
from database.models import (
    Transaction,
    GlAccount,
    Settlement,
    AdvanceRequest,
    Employee,
)
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak
)

from api.advance import update_ppc_status
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.pagesizes import A4

router = APIRouter(
    prefix="/export",
    tags=["Export"]
)

# ==========================================================
# HELPER
# ==========================================================

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


def rupiah(value):

    return f"Rp {float(value or 0):,.0f}"


def format_period(start_date, end_date):

    if not start_date and not end_date:
        return "All Data"

    if start_date and end_date:
        return f"{start_date} s/d {end_date}"

    if start_date:
        return f"{start_date} s/d Sekarang"

    return f"Sampai {end_date}"


def count_workdays(start, end):

    days = 0

    current = start

    while current <= end:

        if current.weekday() < 5:
            days += 1

        current += timedelta(days=1)

    return days

# PDF HELPER
def calculate_percentage(value, total):

    if not total:
        return 0.0

    return (float(value) / float(total)) * 100


def calculate_growth(current, previous):
    """
    Growth dibanding periode sebelumnya.
    """
    if previous in (0, None):
        return None

    return round(
        ((current - previous) / previous) * 100,
        2
    )

def determine_trend_group(start_date, end_date):
    """
    <=31 hari  -> day

    >31 hari   -> month

    tanpa filter -> month
    """

    if not start_date or not end_date:
        return "month"

    total_days = (end_date - start_date).days

    if total_days <= 31:
        return "day"

    return "month"


def create_table(data, widths=None):

    table = Table(
        data,
        colWidths=widths
    )

    table.setStyle(TABLE_STYLE)

    return table

# Advance Helper
def apply_advance_date_filter(
    query,
    start_date,
    end_date
):

    if start_date:
        query = query.filter(
            AdvanceRequest.request_date >= start_date
        )

    if end_date:
        query = query.filter(
            AdvanceRequest.request_date <= end_date
        )

    return query

TABLE_STYLE = TableStyle([

    # Header
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F4E78")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 10),

    # Isi tabel
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 1), (-1, -1), 9),

    # Grid
    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),

    # Alignment
    ("ALIGN", (0, 0), (-1, 0), "CENTER"),
    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),

    # Padding
    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 1), (-1, -1), 5),

    # Warna isi
    ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),

])
#=============================================================
# EXPORT EXCEL
# GET /export/excel

@router.get("/excel")
def export_excel(

    start_date: Optional[date] = Query(None),

    end_date: Optional[date] = Query(None),

    db: Session = Depends(get_db)

):

    try:

        query = db.query(Transaction)

        query = apply_date_filter(
            query,
            start_date,
            end_date
        )

        transactions = (
            query
            .order_by(
                Transaction.posting_date
            )
            .all()
        )

        rows = []

        for row in transactions:
            rows.append({
                "Posting Date":
                    row.posting_date,
                "Document No":
                    row.document_no,
                "Amount":
                    row.amount,
                "Currency":
                    row.currency,
                "GL Account":
                    row.gl_account,
                "Cost Center":
                    row.cost_center,
                "Reference":
                    row.reference,
                "Transaction Type":
                    row.transaction_type,
                "Description":
                    row.description,
                "Month":
                    row.month,
                "Year":
                    row.year,
                "Uploaded At":
                    row.uploaded_at.strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                    if row.uploaded_at
                    else ""
            })

        df = pd.DataFrame(rows)
        if df.empty:
            df = pd.DataFrame(columns=[
                "Posting Date",
                "Document No",
                "Amount",
                "Currency",
                "GL Account",
                "Cost Center",
                "Reference",
                "Transaction Type",
                "Description",
                "Month",
                "Year",
                "Uploaded At"
            ])

        output = io.BytesIO()

        with pd.ExcelWriter(
            output,
            engine="openpyxl"
        ) as writer:
            df.to_excel(
                writer,
                sheet_name="Transactions",
                index=False
            )

            worksheet = writer.sheets["Transactions"]

            # Auto Width Column

            for column in worksheet.columns:
                max_length = max(
                    len(str(cell.value))
                    if cell.value is not None
                    else 0
                    for cell in column
                )

                worksheet.column_dimensions[
                    column[0].column_letter
                ].width = max_length + 3

        output.seek(0)
        filename = (
            f"dashboard_export_"
            f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        )

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition":
                    f'attachment; filename="{filename}"'
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# EXPORT PDF
# GET /export/pdf
@router.get("/pdf")
def export_dashboard_pdf(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):

    try:
    
        # SUMMARY
        summary_query = apply_date_filter(
            db.query(Transaction),
            start_date,
            end_date
        )

        summary = summary_query.with_entities(
            func.sum(Transaction.amount),
            func.count(Transaction.id),
            func.count(func.distinct(Transaction.gl_account)),
            func.count(func.distinct(Transaction.cost_center))

        ).first()
        total_expense = float(summary[0] or 0)
        total_transaction = summary[1] or 0
        total_gl = summary[2] or 0
        total_cc = summary[3] or 0

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

        # TOP GL ACCOUNT
        gl_query = (
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

        gl_query = apply_date_filter(
            gl_query,
            start_date,
            end_date
        )

        gl = (
            gl_query
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

        # TOP COST CENTER
    
        cc_query = db.query(

            Transaction.cost_center,

            func.sum(Transaction.amount).label("total_amount")

        )

        cc_query = apply_date_filter(
            cc_query,
            start_date,
            end_date
        )

        cc = (
            cc_query
            .group_by(Transaction.cost_center)
            .order_by(
                func.sum(Transaction.amount).desc()
            )
            .limit(10)
            .all()
        )

        # TOP COST CENTER DETAIL
        
        top_cc = (
            db.query(
                Transaction.cost_center,
                func.sum(Transaction.amount).label("total_amount")
            )
        )

        top_cc = apply_date_filter(
            top_cc,
            start_date,
            end_date
        )

        top_cc = (
            top_cc
            .group_by(Transaction.cost_center)
            .order_by(
                func.sum(Transaction.amount).desc()
            )
            .first()
        )

        detail = []

        if top_cc:

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

            detail = (
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

        # TREND
        
        trend_group = determine_trend_group(
            start_date,
            end_date
        )

        if trend_group == "day":

            trend_query = db.query(

                func.date(Transaction.posting_date).label("period"),

                func.sum(Transaction.amount).label("total_amount")

            )

            trend_query = apply_date_filter(
                trend_query,
                start_date,
                end_date
            )

            trend = (
                trend_query
                .group_by(
                    func.date(Transaction.posting_date)
                )
                .order_by(
                    func.date(Transaction.posting_date)
                )
                .all()
            )

        else:

            trend_query = db.query(
                Transaction.year,
                Transaction.month,
                func.sum(Transaction.amount).label("total_amount")
            )
            trend_query = apply_date_filter(
                trend_query,
                start_date,
                end_date
            )
            trend = (
                trend_query
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

                
        # BUILD PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5 * cm,
            leftMargin=1.5 * cm,
            topMargin=1.5 * cm,
            bottomMargin=1.5 * cm
        )

        styles = getSampleStyleSheet()
        story = []

        # HEADER
        story.append(
            Paragraph(
                "<b>REFCON Dashboard Report</b>",
                styles["Title"]
            )
        )

        story.append(
            Spacer(1, 0.4 * cm)
        )

        story.append(
            Paragraph(
                f"<b>Period :</b> {format_period(start_date, end_date)}",
                styles["Normal"]
            )
        )

        story.append(
            Paragraph(
                f"<b>Generated :</b> {datetime.now().strftime('%d-%m-%Y %H:%M')} WIB",
                styles["Normal"]
            )
        )

        story.append(
            Spacer(1, 0.6 * cm)
        )

        # DASHBOARD SUMMARY
        story.append(
            Paragraph(
                "<b>Dashboard Summary</b>",
                styles["Heading2"]
            )
        )

        summary_table = [
            ["Metric", "Value"],
            ["Total Expense", rupiah(total_expense)],
            ["Total Transaction", f"{total_transaction:,}"],
            ["Total Cost Center", f"{total_cc:,}"],
            ["Average Daily Expense", rupiah(average_daily_expense)]
        ]

        story.append(
            create_table(
                summary_table,
                widths=[9 * cm, 7 * cm]
            )
        )

        story.append(
            Spacer(1, 0.7 * cm)
        )

        # TOP GL ACCOUNT
        story.append(
            Paragraph(
                "<b>Top 10 GL Account</b>",
                styles["Heading2"]
            )
        )

        gl_table = [[
            "GL Account",
            "GL Name",
            "Amount",
            "%"
        ]]

        for row in gl:

            percentage = calculate_percentage(
                row.total_amount,
                total_expense
            )

            gl_table.append([
                row.gl_account,
                row.nama_gl_account or "-",
                rupiah(row.total_amount),
                f"{percentage:.2f}%"
            ])
        story.append(
            create_table(
                gl_table,
                widths=[
                    3*cm,
                    7*cm,
                    4*cm,
                    2*cm
                ]
            )
        )

        story.append(
            Spacer(1,0.7*cm)
        )

        story.append(
            PageBreak()
        )
        # TOP COST CENTER
  
        story.append(
            Paragraph(
                "<b>Top 10 Cost Center</b>",
                styles["Heading2"]
            )
        )

        cc_table = [[
            "Cost Center",
            "Amount",
            "%"
        ]]

        for row in cc:
            percentage = calculate_percentage(
                row.total_amount,
                total_expense
            )

            cc_table.append([
                row.cost_center,
                rupiah(row.total_amount),
                f"{percentage:.2f}%"
            ])

        story.append(
            create_table(
                cc_table,
                widths=[
                    6*cm,
                    7*cm,
                    3*cm
                ]
            )
        )

        # EXPENSE DETAIL BY TOP COST CENTER

        story.append(
            Paragraph(
                "<b>Expense Detail by Top Cost Center</b>",
                styles["Heading2"]
            )
        )

        if top_cc:

            story.append(
                Paragraph(
                    f"<b>Cost Center :</b> {top_cc.cost_center}",
                    styles["Normal"]
                )
            )

            story.append(
                Spacer(1,0.3*cm)
            )

            detail_table = [[
                "GL Account",
                "GL Name",
                "Amount",
                "%"
            ]]

            for row in detail:
                percentage = calculate_percentage(
                    row.total_amount,
                    top_cc.total_amount
                )
                detail_table.append([
                    row.gl_account,
                    row.nama_gl_account or "-",
                    rupiah(row.total_amount),
                    f"{percentage:.2f}%"
                ])

            story.append(
                create_table(
                    detail_table,
                    widths=[
                        3*cm,
                        7*cm,
                        4*cm,
                        2*cm
                    ]
                )
            )

        else:

            story.append(
                Paragraph(
                    "No data available.",
                    styles["Normal"]
                )
            )

        story.append(
            Spacer(1,0.7*cm)
        )

        story.append(
            PageBreak()
        )
        
        # EXPENSE TREND
        story.append(
            Paragraph(
                "<b>Expense Trend</b>",
                styles["Heading2"]
            )
        )
        trend_table = [[
            "Period",
            "Amount",
            "Growth (%)"
        ]]

        previous_amount = None
        for row in trend:
            if trend_group == "day":
                period = str(row.period)
            else:
                period = f"{row.year}-{str(row.month).zfill(2)}"
            growth = calculate_growth(
                float(row.total_amount),
                previous_amount
            )
            trend_table.append([
                period,
                rupiah(row.total_amount),
                "-" if growth is None else f"{growth:.2f}%"
            ])
            previous_amount = float(row.total_amount)

        story.append(
            create_table(
                trend_table,
                widths=[
                    5*cm,
                    7*cm,
                    4*cm
                ]
            )
        )

        #  FOOTER
        story.append(
            Spacer(1,0.7*cm)
        )
        story.append(
            Paragraph(
                "<font size='8' color='grey'>Generated automatically by REFCON Dashboard.</font>",
                styles["Normal"]
            )
        )

        # BUILD PDF

        doc.build(story)
        buffer.seek(0)
        filename = (
            f"dashboard_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        )
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    
# Export Settlement Excel
@router.get("/settlement")
def export_settlement(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = (
        db.query(Settlement)
        .options(
            joinedload(Settlement.employee)
        )
    )

    # Filter Tanggal
    if start_date:
        query = query.filter(
            Settlement.settlement_date >= start_date
        )

    if end_date:
        query = query.filter(
            Settlement.settlement_date <= end_date
        )

    settlements = (
        query
        .order_by(
            Settlement.settlement_date.desc()
        )
        .all()
    )

    if not settlements:

        raise HTTPException(
            status_code=404,
            detail="Tidak ada data Settlement."
        )
    
    rows = []
    for item in settlements:
        rows.append({
            "PPC No": item.ppc_no,
            "Settlement Date": item.settlement_date,
            "Employee Name": (
                item.employee.employee_name
                if item.employee
                else ""
            ),
            "Email": item.email,
            "Cost Center": item.cost_center,
            "Description": item.description,
            "Settlement Amount": item.settlement_amount,
            "Source": item.source.value
        })

    df = pd.DataFrame(rows)
    output = BytesIO()

    with pd.ExcelWriter(
        output,
        engine="openpyxl"
    ) as writer:

        df.to_excel(
            writer,
            index=False,
            sheet_name="Settlement"
        )

    output.seek(0)
    
    return StreamingResponse(

        output,

        media_type=(
            "application/"
            "vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),

        headers={

            "Content-Disposition":
            "attachment; filename=settlement_export.xlsx"
        }
    )


# EXPORT ADVANCE
# ==========================================================
# EXPORT ADVANCE
# ==========================================================

@router.get("/advance")
def export_ppc(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):

    query = db.query(AdvanceRequest)

    # Filter tanggal
    query = apply_advance_date_filter(
        query=query,
        start_date=start_date,
        end_date=end_date,
    )

    ppc_list = (
        query
        .order_by(
            AdvanceRequest.request_date.desc()
        )
        .all()
    )

    # Tidak ada data
    if not ppc_list:
        raise HTTPException(
            status_code=404,
            detail="Tidak ada data PPC."
        )

    rows = []

    for ppc in ppc_list:

        # Update status terlebih dahulu
        update_ppc_status(ppc, db)

        status = ppc.status.value

        rows.append(
            {
                "Request Date": ppc.request_date,
                "PPC No": ppc.ppc_no,
                "Employee Name": ppc.employee_name,
                "Cost Center": ppc.cost_center,
                "Purpose": ppc.purpose,
                "Amount": ppc.amount,
                "Due Date": ppc.due_date,
                "Status": status,
            }
        )

    # Simpan perubahan status apabila ada yang berubah
    db.commit()

    df = pd.DataFrame(rows)

    output = io.BytesIO()

    with pd.ExcelWriter(
        output,
        engine="openpyxl",
    ) as writer:

        df.to_excel(
            writer,
            index=False,
            sheet_name="Advance",
        )

        # Auto fit column width
        worksheet = writer.sheets["Advance"]

        for column_cells in worksheet.columns:

            length = max(
                len(str(cell.value))
                if cell.value is not None else 0
                for cell in column_cells
            )

            worksheet.column_dimensions[
                column_cells[0].column_letter
            ].width = max(length + 3, 15)

    output.seek(0)

    return StreamingResponse(
        output,
        media_type=(
            "application/"
            "vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
            "attachment; filename=advance_export.xlsx"
        },
    )

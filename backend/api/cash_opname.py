import json
import io
from datetime import date, datetime
from zoneinfo import ZoneInfo
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import (
    CashOpname,
    Settlement,
    SettlementSource,
    AdvanceRequest,
    AdvanceStatus,
)
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm

router = APIRouter(
    prefix="/cash-opname",
    tags=["Cash Opname"]
)


class CashOpnameCreate(BaseModel):
    dariTanggal: date
    sampaiTanggal: date
    jam: str
    saldoAwal: float
    dibuatOleh1: str
    dibuatOleh2: str
    mengetahui: str
    totalA: float
    totalB: float
    totalAB: float
    saldoAkhir: float
    aksi: Optional[str] = "Simpan"
    settlementRows: Optional[List[Any]] = []
    advanceRows: Optional[List[Any]] = []


def serialize_cash_opname(item: CashOpname):
    settlement_rows = []
    advance_rows = []

    if item.settlement_rows_json:
        try:
            settlement_rows = json.loads(item.settlement_rows_json)
        except Exception:
            settlement_rows = []

    if item.advance_rows_json:
        try:
            advance_rows = json.loads(item.advance_rows_json)
        except Exception:
            advance_rows = []

    return {
        "id": item.id,
        "dariTanggal": item.dari_tanggal.isoformat() if item.dari_tanggal else "",
        "sampaiTanggal": item.sampai_tanggal.isoformat() if item.sampai_tanggal else "",
        "jam": item.jam,
        "saldoAwal": item.saldo_awal,
        "dibuatOleh1": item.dibuat_oleh_1,
        "dibuatOleh2": item.dibuat_oleh_2,
        "mengetahui": item.mengetahui,
        "totalA": item.total_a,
        "totalB": item.total_b,
        "totalAB": item.total_ab,
        "saldoAkhir": item.saldo_akhir,
        "aksi": item.aksi,
        "settlementRows": settlement_rows,
        "advanceRows": advance_rows,
        "createdAt": item.created_at.isoformat() if item.created_at else "",
    }

# RECAP SETTLEMENT
@router.get("/recap/settlement")
def get_settlement_recap(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)
):
    settlements = (
        db.query(Settlement)
        .filter(
            Settlement.settlement_date >= start_date,
            Settlement.settlement_date <= end_date,
            Settlement.is_deleted == False
        )
        .order_by(
            Settlement.settlement_date.asc(),
            Settlement.id.asc()
        )
        .all()
    )

    result = []
    for item in settlements:
        tipe = "STLM" if item.source == SettlementSource.ADVANCE else "RMB"
        desc = item.description if item.description else ""
        keterangan = desc

        result.append({
            "id": item.id,
            "tanggal": item.settlement_date.isoformat(),
            "tipe": tipe,
            "kode": item.ppc_no,
            "namaUser": item.employee_name,
            "keterangan": keterangan,
            "jumlah": item.settlement_amount
        })

    return result


# RECAP ADVANCE 
@router.get("/recap/advance")
def get_advance_recap(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)
):
    advances = (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.request_date >= start_date,
            AdvanceRequest.request_date <= end_date,
            AdvanceRequest.status.in_([
                AdvanceStatus.ACTIVE,
                AdvanceStatus.OVERDUE,
            ])
        )
        .order_by(
            AdvanceRequest.request_date.asc(),
            AdvanceRequest.id.asc()
        )
        .all()
    )
    result = []

    for idx, item in enumerate(advances, start=1):
        purpose = item.purpose if item.purpose else ""
        keterangan = purpose
        result.append({
            "id": item.id,
            "tanggal": item.request_date.isoformat(),
            "tipe": f"UM{idx}",
            "kode": item.ppc_no,
            "namaUser": item.employee_name,
            "keterangan": keterangan,
            "jumlah": item.amount,
            "status": item.status.value if hasattr(item.status, "value") else str(item.status),
        })

    return result

# HISTORY CASH OPNAME
@router.get("/history")
def get_cash_opname_history(
    db: Session = Depends(get_db)
):
    records = (
        db.query(CashOpname)
        .order_by(
            CashOpname.created_at.desc(),
            CashOpname.id.desc()
        )
        .all()
    )

    return [serialize_cash_opname(item) for item in records]


# SAVE CASH OPNAME
@router.post("")
def save_cash_opname(
    data: CashOpnameCreate,
    db: Session = Depends(get_db)
):
    record = CashOpname(
        dari_tanggal=data.dariTanggal,
        sampai_tanggal=data.sampaiTanggal,
        jam=data.jam,
        saldo_awal=data.saldoAwal,
        dibuat_oleh_1=data.dibuatOleh1.strip(),
        dibuat_oleh_2=data.dibuatOleh2.strip(),
        mengetahui=data.mengetahui.strip(),
        total_a=data.totalA,
        total_b=data.totalB,
        total_ab=data.totalAB,
        saldo_akhir=data.saldoAkhir,
        aksi=data.aksi or "Simpan",
        settlement_rows_json=json.dumps(data.settlementRows or []),
        advance_rows_json=json.dumps(data.advanceRows or []),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Cash Opname berhasil disimpan.",
        "data": serialize_cash_opname(record)
    }


# UPDATE CASH OPNAME
@router.put("/{id}")
def update_cash_opname(
    id: int,
    data: CashOpnameCreate,
    db: Session = Depends(get_db)
):
    record = (
        db.query(CashOpname)
        .filter(CashOpname.id == id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Data Cash Opname tidak ditemukan."
        )

    record.dari_tanggal = data.dariTanggal
    record.sampai_tanggal = data.sampaiTanggal
    record.jam = data.jam
    record.saldo_awal = data.saldoAwal
    record.dibuat_oleh_1 = data.dibuatOleh1.strip()
    record.dibuat_oleh_2 = data.dibuatOleh2.strip()
    record.mengetahui = data.mengetahui.strip()
    record.total_a = data.totalA
    record.total_b = data.totalB
    record.total_ab = data.totalAB
    record.saldo_akhir = data.saldoAkhir
    record.aksi = data.aksi or "Simpan"
    record.settlement_rows_json = json.dumps(data.settlementRows or [])
    record.advance_rows_json = json.dumps(data.advanceRows or [])

    db.commit()
    db.refresh(record)

    return {
        "message": "Cash Opname berhasil diperbarui.",
        "data": serialize_cash_opname(record)
    }


# DELETE CASH OPNAME
@router.delete("/{id}")
def delete_cash_opname(
    id: int,
    db: Session = Depends(get_db)
):
    record = (
        db.query(CashOpname)
        .filter(CashOpname.id == id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Data Cash Opname tidak ditemukan."
        )

    db.delete(record)
    db.commit()

    return {
        "id": id,
        "message": "Data Cash Opname berhasil dihapus."
    }


def format_date_id(val):
    if not val:
        return "-"
    if isinstance(val, (date, datetime)):
        return val.strftime("%d/%m/%Y")
    parts = str(val).split("-")
    if len(parts) == 3:
        return f"{parts[2]}/{parts[1]}/{parts[0]}"
    return str(val)


def rupiah_format(value):
    val = float(value or 0)
    formatted = f"{val:,.0f}"
    return "Rp. " + formatted.replace(",", ".")


@router.get("/{id}/pdf")
def export_cash_opname_pdf(
    id: int,
    db: Session = Depends(get_db)
):
    record = (
        db.query(CashOpname)
        .filter(CashOpname.id == id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Data Cash Opname tidak ditemukan."
        )
    
    # generate print datetime in WIB timezone
    print_datetime = datetime.now(ZoneInfo("Asia/Jakarta"))
    print_datetime_text = print_datetime.strftime(
        "%d/%m/%Y %H:%M:%S WIB"
    )

    # Parse rows
    settlement_rows = []
    advance_rows = []
    if record.settlement_rows_json:
        try:
            settlement_rows = json.loads(record.settlement_rows_json)
        except Exception:
            settlement_rows = []
    if record.advance_rows_json:
        try:
            advance_rows = json.loads(record.advance_rows_json)
        except Exception:
            advance_rows = []

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.5 * cm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=16,
        alignment=1,
        spaceAfter=2
    )
    company_style = ParagraphStyle(
        'HeaderCompany',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        alignment=1,
        spaceAfter=6
    )
    period_style = ParagraphStyle(
        'HeaderPeriod',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        alignment=1,
        spaceAfter=15
    )

    normal_cell_style = ParagraphStyle(
        'NormalCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10
    )

    # waktu cetak style
    print_datetime_style = ParagraphStyle(
        'PrintDateTime',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=2,  # RIGHT
        textColor=colors.HexColor("#666666"),
        spaceBefore=12,
        spaceAfter=0
    )

    story = []
    story.append(Paragraph("LAPORAN PETTY CASH", title_style))
    story.append(Paragraph("PT. SMART Tbk UNIT SURABAYA", company_style))
    story.append(Paragraph(f"PER TANGGAL : {format_date_id(record.sampai_tanggal)}", period_style))

    # Table columns: Tanggal, Nomor PPC, Nama User, Keterangan, Jumlah, Spacer
    table_data = []
    t_style = TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ])

    # Row 0: Saldo Awal
    table_data.append(["SALDO AWAL PETTY CASH", "", "", "", "", rupiah_format(record.saldo_awal)])
    r_idx = 0
    t_style.add('SPAN', (0, r_idx), (4, r_idx))
    t_style.add('FONTNAME', (0, r_idx), (-1, r_idx), 'Helvetica-Bold')
    t_style.add('FONTSIZE', (0, r_idx), (-1, r_idx), 9)
    t_style.add('ALIGN', (5, r_idx), (5, r_idx), 'RIGHT')

    # Row 1: Section A Title
    table_data.append(["A. PENGELUARAN YANG SUDAH SELESAI", "", "", "", "", ""])
    r_idx += 1
    t_style.add('SPAN', (0, r_idx), (5, r_idx))
    t_style.add('FONTNAME', (0, r_idx), (-1, r_idx), 'Helvetica-Bold')
    t_style.add('FONTSIZE', (0, r_idx), (-1, r_idx), 9)
    t_style.add('TOPPADDING', (0, r_idx), (-1, r_idx), 8)
    t_style.add('BOTTOMPADDING', (0, r_idx), (-1, r_idx), 3)

    # Row 2: Section A Headers
    table_data.append(["Tanggal", "Nomor PPC", "Nama User", "Keterangan", "Jumlah", ""])
    r_idx += 1
    t_style.add('BACKGROUND', (0, r_idx), (4, r_idx), colors.HexColor("#f8fafc"))
    t_style.add('ALIGN', (0, r_idx), (4, r_idx), 'CENTER')
    t_style.add('FONTNAME', (0, r_idx), (4, r_idx), 'Helvetica-Bold')
    t_style.add('GRID', (0, r_idx), (4, r_idx), 0.5, colors.black)

    # Section A rows
    if not settlement_rows:
        table_data.append(["Tidak ada data pengeluaran", "", "", "", "", ""])
        r_idx += 1
        t_style.add('SPAN', (0, r_idx), (4, r_idx))
        t_style.add('ALIGN', (0, r_idx), (4, r_idx), 'CENTER')
        t_style.add('TEXTCOLOR', (0, r_idx), (4, r_idx), colors.grey)
        t_style.add('GRID', (0, r_idx), (4, r_idx), 0.5, colors.black)
    else:
        for row in settlement_rows:
            tanggal = format_date_id(row.get('tanggal'))
            kode = row.get('kode') or row.get('ppc_no') or "-"
            nama_user = Paragraph(row.get('namaUser') or row.get('nama_user') or "-", normal_cell_style)
            keterangan = Paragraph(row.get('keterangan') or row.get('description') or "-", normal_cell_style)
            jumlah = rupiah_format(row.get('jumlah'))
            table_data.append([tanggal, kode, nama_user, keterangan, jumlah, ""])
            r_idx += 1
            t_style.add('GRID', (0, r_idx), (4, r_idx), 0.5, colors.black)
            t_style.add('ALIGN', (0, r_idx), (1, r_idx), 'CENTER')
            t_style.add('ALIGN', (2, r_idx), (3, r_idx), 'LEFT')
            t_style.add('ALIGN', (4, r_idx), (4, r_idx), 'RIGHT')

    # Section A Subtotal
    table_data.append(["", "", "", "", rupiah_format(record.total_a), ""])
    r_idx += 1
    t_style.add('FONTNAME', (4, r_idx), (4, r_idx), 'Helvetica-Bold')
    t_style.add('ALIGN', (4, r_idx), (4, r_idx), 'RIGHT')
    t_style.add('LINEABOVE', (4, r_idx), (4, r_idx), 1, colors.black)
    t_style.add('LINEBELOW', (4, r_idx), (4, r_idx), 1, colors.black)

    # Section B Title
    table_data.append(["B. UANG MUKA", "", "", "", "", ""])
    r_idx += 1
    t_style.add('SPAN', (0, r_idx), (5, r_idx))
    t_style.add('FONTNAME', (0, r_idx), (-1, r_idx), 'Helvetica-Bold')
    t_style.add('FONTSIZE', (0, r_idx), (-1, r_idx), 9)
    t_style.add('TOPPADDING', (0, r_idx), (-1, r_idx), 12)
    t_style.add('BOTTOMPADDING', (0, r_idx), (-1, r_idx), 3)

    # Section B Headers
    table_data.append(["Tanggal", "Nomor PPC", "Nama User", "Keterangan", "Jumlah", ""])
    r_idx += 1
    t_style.add('BACKGROUND', (0, r_idx), (4, r_idx), colors.HexColor("#f8fafc"))
    t_style.add('ALIGN', (0, r_idx), (4, r_idx), 'CENTER')
    t_style.add('FONTNAME', (0, r_idx), (4, r_idx), 'Helvetica-Bold')
    t_style.add('GRID', (0, r_idx), (4, r_idx), 0.5, colors.black)

    # Section B rows
    if not advance_rows:
        table_data.append(["Tidak ada data uang muka", "", "", "", "", ""])
        r_idx += 1
        t_style.add('SPAN', (0, r_idx), (4, r_idx))
        t_style.add('ALIGN', (0, r_idx), (4, r_idx), 'CENTER')
        t_style.add('TEXTCOLOR', (0, r_idx), (4, r_idx), colors.grey)
        t_style.add('GRID', (0, r_idx), (4, r_idx), 0.5, colors.black)
    else:
        for row in advance_rows:
            tanggal = format_date_id(row.get('tanggal'))
            kode = row.get('kode') or row.get('ppc_no') or "-"
            nama_user = Paragraph(row.get('namaUser') or row.get('nama_user') or "-", normal_cell_style)
            keterangan = Paragraph(row.get('keterangan') or row.get('description') or "-", normal_cell_style)
            jumlah = rupiah_format(row.get('jumlah'))
            table_data.append([tanggal, kode, nama_user, keterangan, jumlah, ""])
            r_idx += 1
            t_style.add('GRID', (0, r_idx), (4, r_idx), 0.5, colors.black)
            t_style.add('ALIGN', (0, r_idx), (1, r_idx), 'CENTER')
            t_style.add('ALIGN', (2, r_idx), (3, r_idx), 'LEFT')
            t_style.add('ALIGN', (4, r_idx), (4, r_idx), 'RIGHT')

    # Section B Subtotal
    table_data.append(["", "", "", "", rupiah_format(record.total_b), ""])
    r_idx += 1
    t_style.add('FONTNAME', (4, r_idx), (4, r_idx), 'Helvetica-Bold')
    t_style.add('ALIGN', (4, r_idx), (4, r_idx), 'RIGHT')
    t_style.add('LINEABOVE', (4, r_idx), (4, r_idx), 1, colors.black)
    t_style.add('LINEBELOW', (4, r_idx), (4, r_idx), 1, colors.black)

    # Empty Spacer Row
    table_data.append(["", "", "", "", "", ""])
    r_idx += 1

    # Total Pengeluaran Row
    table_data.append(["", "", "", "TOTAL PENGELUARAN", "", rupiah_format(record.total_ab)])
    r_idx += 1
    t_style.add('SPAN', (3, r_idx), (4, r_idx))
    t_style.add('FONTNAME', (3, r_idx), (-1, r_idx), 'Helvetica-Bold')
    t_style.add('ALIGN', (3, r_idx), (3, r_idx), 'RIGHT')
    t_style.add('ALIGN', (5, r_idx), (5, r_idx), 'RIGHT')
    t_style.add('LINEBELOW', (5, r_idx), (5, r_idx), 2, colors.black)

    # Saldo Akhir Row
    table_data.append(["", "", "", "SALDO AKHIR", "", rupiah_format(record.saldo_akhir)])
    r_idx += 1
    t_style.add('SPAN', (3, r_idx), (4, r_idx))
    t_style.add('FONTNAME', (3, r_idx), (-1, r_idx), 'Helvetica-Bold')
    t_style.add('ALIGN', (3, r_idx), (3, r_idx), 'RIGHT')
    t_style.add('ALIGN', (5, r_idx), (5, r_idx), 'RIGHT')

    col_widths = [1.6 * cm, 2.2 * cm, 3.2 * cm, 6.0 * cm, 2.5 * cm, 2.5 * cm]
    report_table = Table(table_data, colWidths=col_widths)
    report_table.setStyle(t_style)
    story.append(report_table)

    # Signatures
    story.append(Spacer(1, 1.0 * cm))
    sig_data = [
        ["Dibuat oleh :", "", "", "Mengetahui,"],
        ["", "", "", ""],
        [record.dibuat_oleh_1, record.dibuat_oleh_2, "", record.mengetahui]
    ]
    sig_table = Table(sig_data, colWidths=[4.5 * cm, 4.5 * cm, 3.0 * cm, 6.0 * cm])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (1, -1), 'LEFT'),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 35),
    ]))
    story.append(sig_table)

    # waktu cetak
    story.append(
        Paragraph(f"Dicetak pada: {print_datetime_text}", print_datetime_style))
    # pdf build
    doc.build(story)
    buffer.seek(0)

    filename = f"Cash Opname {record.sampai_tanggal.isoformat() if record.sampai_tanggal else 'export'}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

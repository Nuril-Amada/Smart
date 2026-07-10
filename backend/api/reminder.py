import smtplib
import logging
from datetime import date, datetime
from email.mime.text import MIMEText
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.connection import get_db
from database.models import AdvanceRequest, AdvanceStatus, ReminderLog, ReminderStatus
from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reminders",
    tags=["Email Reminder"]
)

# Pydantic Schemas for API Responses

class ReminderLogResponse(BaseModel):
    id: int
    advance_request_id: int
    request_no: str
    employee_name: str
    email: str
    sent_at: str
    status: str

    class Config:
        from_attributes = True

# Core Logical Functions

def update_overdue_advances(db: Session) -> int:
    """
    Mengubah status Advance Request dari WAITING_SETTLEMENT ke OVERDUE
    jika tanggal deadline sudah lewat dari hari ini.
    """
    today = date.today()
    overdue_requests = db.query(AdvanceRequest).filter(
        AdvanceRequest.status == AdvanceStatus.WAITING_SETTLEMENT,
        AdvanceRequest.deadline_date < today
    ).all()

    for req in overdue_requests:
        req.status = AdvanceStatus.OVERDUE

    if overdue_requests:
        db.commit()

    return len(overdue_requests)

def get_unsettled_overdue_advances(db: Session) -> List[AdvanceRequest]:
    """
    Mengambil seluruh Advance Request yang telah melewati deadline
    dan masih membutuhkan settlement.
    """
    today = date.today()

    return (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.status.in_([
                AdvanceStatus.WAITING_SETTLEMENT,
                AdvanceStatus.OVERDUE
            ]),
            AdvanceRequest.deadline_date <= today
        )
        .all()
    )

def send_email_reminder(req: AdvanceRequest, db: Session) -> bool:
    """
    Mengirim email pengingat ke karyawan terkait.
    Jika SMTP tidak terkonfigurasi, maka dilakukan simulasi pengiriman.
    """

    employee = req.employee

    if not employee or not employee.employee_email:
        logger.warning(
            f"Karyawan atau email tidak ditemukan untuk Request ID {req.id}"
        )
        return False

    to_email = employee.employee_email.strip()

    subject = (
        f"[REMINDER] Pertanggungjawaban Petty Cash - "
        f"Request No: {req.request_no}"
    )

    body = f"""Halo {employee.employee_name},

Ini adalah pengingat otomatis untuk menyelesaikan pertanggungjawaban (settlement) pengajuan uang muka (petty cash advance) Anda:

Nomor Request : {req.request_no}
Tanggal Request : {req.request_date}
Jumlah : IDR {req.amount:,.2f}
Tujuan : {req.purpose}
Deadline : {req.deadline_date}
Status : {req.status.value}

Mohon segera melakukan settlement melalui aplikasi REFCON.

Terima kasih,

Admin REFCON
"""

    sent_ok = False

    logger.info(f"Mengirim reminder ke {to_email}")

    if SMTP_HOST and SMTP_USER:
        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = SMTP_USER
            msg["To"] = to_email

            port = int(SMTP_PORT) if SMTP_PORT else 587

            with smtplib.SMTP(SMTP_HOST, port, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD or "")
                server.sendmail(
                    SMTP_USER,
                    [to_email],
                    msg.as_string()
                )

            sent_ok = True
            logger.info(f"Email reminder berhasil dikirim ke {to_email}")

        except Exception:
            logger.exception(
                f"Gagal mengirim email reminder ke {to_email}"
            )
            sent_ok = False

    else:
        logger.info(f"[SIMULASI EMAIL] Pengiriman ke {to_email}")
        logger.info(f"[SIMULASI SUBJECT] {subject}")
        logger.info(f"[SIMULASI ISI EMAIL]\n{body}")
        sent_ok = True

    log_entry = ReminderLog(
        advance_request_id=req.id,
        email=to_email,
        status=ReminderStatus.SUCCESS if sent_ok else ReminderStatus.FAILED,
        sent_at=datetime.now()
    )

    db.add(log_entry)
    db.commit()

    return sent_ok

def run_reminder_process(db: Session) -> dict:
    """
    Menjalankan proses otomatis reminder:
    1. Update status menjadi OVERDUE.
    2. Mengirim email reminder.
    3. Mengembalikan ringkasan hasil proses.
    """

    logger.info("Reminder process dimulai.")

    total_marked_overdue = update_overdue_advances(db)

    overdue_requests = get_unsettled_overdue_advances(db)

    success_count = 0
    failed_count = 0

    for request in overdue_requests:

        if send_email_reminder(request, db):
            success_count += 1
        else:
            failed_count += 1

    result = {

        "marked_overdue": total_marked_overdue,
        "processed_reminders": len(overdue_requests),
        "success": success_count,
        "failed": failed_count
    }

    logger.info(f"Reminder process selesai. {result}")

    return result

# Route Handlers

@router.post("/run")
def trigger_reminders(db: Session = Depends(get_db)):
    """
    Memicu proses pemindaian status dan pengiriman email pengingat secara manual.
    """
    try:
        result = run_reminder_process(db)
        return {
            "message": "Proses pengiriman reminder selesai dijalankan",
            "details": result
        }
    except Exception as e:
        logger.error(f"Error saat memicu reminder: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kegagalan proses: {str(e)}"
        )


@router.get("/logs")
def get_reminder_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Mengambil riwayat log pengiriman pengingat (dengan pagination).
    """
    query = db.query(ReminderLog).join(
        AdvanceRequest,
        ReminderLog.advance_request_id == AdvanceRequest.id
    )

    total = query.count()

    logs = (
        query.order_by(ReminderLog.sent_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    data = []
    for log in logs:
        employee_name = log.advance_request.employee.employee_name if log.advance_request.employee else "Unknown"
        data.append({
            "id": log.id,
            "advance_request_id": log.advance_request_id,
            "request_no": log.advance_request.request_no,
            "employee_name": employee_name,
            "email": log.email,
            "sent_at": log.sent_at.strftime("%Y-%m-%d %H:%M:%S") if log.sent_at else None,
            "status": log.status.value
        })

    return {
        "page": page,
        "page_size": page_size,
        "total_data": total,
        "total_page": (total + page_size - 1) // page_size,
        "data": data
    }

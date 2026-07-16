import logging
import smtplib
from datetime import date, datetime
from email.mime.text import MIMEText
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import (
    AdvanceRequest,
    AdvanceStatus,
    AdvanceType,
    ReminderLog,
    ReminderStatus
)

from config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reminders",
    tags=["Email Reminder"]
)

# RESPONSE SCHEMA
class ReminderLogResponse(BaseModel):

    id: int
    advance_request_id: int
    document_no: str
    employee_name: str
    email: str
    sent_at: str
    status: str

    class Config:
        from_attributes = True

# SERIALIZER
def serialize_log(log: ReminderLog):

    return {

        "id": log.id,

        "advance_request_id":
            log.advance_request_id,

        "document_no":
            log.advance_request.document_no
            if log.advance_request else None,

        "employee_name":
            log.advance_request.employee.employee_name
            if log.advance_request
            and log.advance_request.employee
            else None,

        "email":
            log.email,

        "sent_at":
            log.sent_at.strftime("%Y-%m-%d %H:%M:%S")
            if log.sent_at
            else None,

        "status":
            log.status.value
    }

# UPDATE STATUS OVERDUE
def update_overdue_advances(db: Session) -> int:

    today = date.today()

    advances = (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.advance_type == AdvanceType.PPC,
            AdvanceRequest.status == AdvanceStatus.ACTIVE,
            AdvanceRequest.due_date < today
        )
        .all()
    )

    for adv in advances:
        adv.status = AdvanceStatus.OVERDUE

    if advances:
        db.commit()

    return len(advances)

# GET OVERDUE ADVANCE PPC
def get_overdue_advances(db: Session) -> List[AdvanceRequest]:

    return (
        db.query(AdvanceRequest)
        .filter(
            AdvanceRequest.advance_type == AdvanceType.PPC,
            AdvanceRequest.status == AdvanceStatus.OVERDUE
        )
        .all()
    )

# CEK EMAIL SUDAH TERKIRIM HARI INI
def reminder_already_sent(
    db: Session,
    advance_id: int
) -> bool:

    log = (
        db.query(ReminderLog)
        .filter(
            ReminderLog.advance_request_id == advance_id,
            ReminderLog.status == ReminderStatus.SUCCESS
        )
        .first()
    )

    return log is not None

# SEND EMAIL
def send_email_reminder(
    advance: AdvanceRequest,
    db: Session
) -> bool:

    if reminder_already_sent(db, advance.id):
        logger.info(
            f"Reminder {advance.document_no} sudah dikirim."
        )
        return True

    employee = advance.employee

    if not employee or not employee.employee_email:

        logger.warning(
            f"Email employee tidak ditemukan ({advance.document_no})"
        )

        return False

    subject = (
        f"[REFCON] Reminder Settlement Advance - {advance.document_no}"
    )

    body = f"""
Kepada Bapak/Ibu {employee.employee_name},

Advance berikut telah melewati Due Date Settlement.

No PPC      : {advance.document_no}
Tanggal     : {advance.request_date}
Amount      : Rp {advance.amount:,.0f}
Keterangan  : {advance.purpose}
Due Date    : {advance.due_date}

Status saat ini :
OVERDUE

Mohon segera melakukan Settlement.

Terima kasih.

Finance
"""

    success = False

    try:

        if SMTP_HOST and SMTP_USER:

            msg = MIMEText(body)

            msg["Subject"] = subject
            msg["From"] = SMTP_USER
            msg["To"] = employee.employee_email

            with smtplib.SMTP(
                SMTP_HOST,
                int(SMTP_PORT)
            ) as smtp:

                smtp.starttls()

                smtp.login(
                    SMTP_USER,
                    SMTP_PASSWORD
                )

                smtp.send_message(msg)

            success = True

        else:

            logger.info(
                "[SIMULASI EMAIL]"
            )

            logger.info(subject)

            logger.info(body)

            success = True

    except Exception as e:

        logger.exception(e)

        success = False

    log = ReminderLog(

        advance_request_id=advance.id,

        email=employee.employee_email,

        status=(
            ReminderStatus.SUCCESS
            if success
            else ReminderStatus.FAILED
        ),

        sent_at=datetime.now()

    )

    db.add(log)
    db.commit()
    return success

# MAIN REMINDER PROCESS
def run_reminder_process(
    db: Session
):

    logger.info(
        "Reminder Process Started"
    )

    marked = update_overdue_advances(db)

    overdue_advances = get_overdue_advances(db)

    success = 0
    failed = 0

    for adv in overdue_advances:

        if send_email_reminder(
            adv,
            db
        ):
            success += 1
        else:
            failed += 1

    result = {

        "marked_overdue": marked,

        "total_overdue":
            len(overdue_advances),

        "success":
            success,

        "failed":
            failed

    }

    logger.info(result)

    return result

# MANUAL TRIGGER
@router.post("/run")
def trigger_reminder(
    db: Session = Depends(get_db)
):
    """
    Menjalankan proses reminder secara manual.
    """

    try:

        result = run_reminder_process(db)

        return {

            "message":
                "Reminder berhasil dijalankan.",

            "result":
                result

        }

    except Exception as e:

        logger.exception(e)

        raise HTTPException(

            status_code=500,

            detail="Gagal menjalankan reminder."

        )


# REMINDER LOGS
@router.get(
    "/logs",
    response_model=list[ReminderLogResponse]
)
def reminder_logs(
    db: Session = Depends(get_db)
):

    logs = (

        db.query(ReminderLog)

        .order_by(
            ReminderLog.sent_at.desc()
        )

        .all()

    )

    return [

        serialize_log(log)

        for log in logs

    ]


# REMINDER LOG DETAIL
@router.get(
    "/logs/{log_id}",
    response_model=ReminderLogResponse
)
def reminder_log_detail(

    log_id: int,

    db: Session = Depends(get_db)

):

    log = (

        db.query(ReminderLog)

        .filter(
            ReminderLog.id == log_id
        )

        .first()

    )

    if not log:

        raise HTTPException(

            status_code=404,

            detail="Reminder log tidak ditemukan."

        )

    return serialize_log(log)
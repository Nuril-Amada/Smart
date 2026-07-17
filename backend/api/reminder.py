import logging
import smtplib

from collections import defaultdict
from datetime import date, datetime
from email.mime.text import MIMEText
from typing import List

from fastapi import APIRouter, Depends, HTTPException
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
            log.advance_request.ppc_no
            if log.advance_request
            else None,

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

    today = date.today()

    log = (
        db.query(ReminderLog)
        .filter(
            ReminderLog.advance_request_id == advance_id,
            ReminderLog.status == ReminderStatus.SUCCESS
        )
        .order_by(
            ReminderLog.sent_at.desc()
        )
        .first()
    )

    if not log:
        return False

    return log.sent_at.date() == today

# Table advance
def build_advance_table(
    advances: List[AdvanceRequest]
) -> str:

    rows = ""

    for advance in advances:

        rows += f"""
        <tr>
            <td>{advance.request_date}</td>
            <td>{advance.ppc_no}</td>
            <td>{advance.employee.employee_name}</td>
            <td>{advance.purpose}</td>
            <td>Rp {advance.amount:,.0f}</td>
            <td>Outstanding</td>
        </tr>
        """

    return f"""
    <table
        border="1"
        cellspacing="0"
        cellpadding="8"
        style="
            border-collapse: collapse;
            width:100%;
            text-align:center;
        "
    >

        <thead>
            <tr>
                <th>Tanggal</th>
                <th>Nomor PPC</th>
                <th>Nama User</th>
                <th>Keterangan</th>
                <th>Nominal</th>
                <th>Status</th>
            </tr>
        </thead>

        <tbody>

            {rows}

        </tbody>

    </table>
    """
# BUILD MEMO
def build_internal_memo() -> str:

    today = date.today()

    return f"""
    <br>
    <b>INTERNAL MEMO</b>
    <br><br>
    'Uang tunai yang diterima karyawan melalui Petty Cash harus dipertanggungjawabkan maksimum 2 (dua) hari kerja setelah uang diterima.'
    036/BYM-FA/XII/2017
    <br><br>

    Best Regards,
    <br>
    Finance Department
    """

# SEND EMAIL
def send_email_reminder(

    employee,
    advances: List[AdvanceRequest],
    db: Session

) -> bool:


    # ---------------------------------
    # Skip jika seluruh PPC hari ini
    # sudah pernah direminder
    # ---------------------------------

    unsent_advances = []

    for advance in advances:

        if not reminder_already_sent(
            db,
            advance.id
        ):

            unsent_advances.append(
                advance
            )


    if len(unsent_advances) == 0:

        return True


    # ---------------------------------
    # Subject
    # ---------------------------------

    subject = (

        "[REFCON] Reminder Outstanding Settlement PPC"

    )


    # ---------------------------------
    # Body Email
    # ---------------------------------

    table_html = build_advance_table(
        unsent_advances
    )

    internal_memo = build_internal_memo()


    body = f"""

    <html>

    <body>

    <p>
        Kepada Bapak/Ibu
        <b>{employee.employee_name}</b>,
    </p>


    <p>
        Berikut adalah daftar Petty Cash
        yang masih outstanding dan
        belum dilakukan settlement.
    </p>


    <br>

    <b>UANG MUKA</b>

    <br><br>

    {table_html}


    <br>

    {internal_memo}


    </body>

    </html>

    """

    success = False

    try:
        if SMTP_HOST and SMTP_USER:
            msg = MIMEText(
                body,
                "html"
            )

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

                smtp.send_message(
                    msg
                )


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

    for advance in unsent_advances:
        log = ReminderLog(
            advance_request_id=
                advance.id,
            email=
                employee.employee_email,
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
    # Ubah ACTIVE -> OVERDUE
    marked = update_overdue_advances(db)
    # Ambil seluruh PPC yang OVERDUE
    overdue_advances = get_overdue_advances(db)
    # Kelompokkan PPC berdasarkan employee
    grouped_advances = defaultdict(list)
    for advance in overdue_advances:
        grouped_advances[
            advance.employee.id
        ].append(
            advance
        )

    success = 0
    failed = 0

    # Kirim 1 email untuk setiap employee
    for employee_id, advances in grouped_advances.items():
        employee = advances[0].employee
        if send_email_reminder(
            employee,
            advances,
            db
        ):
            success += 1
        else:
            failed += 1

    # Summary hasil reminder
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
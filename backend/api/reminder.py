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
    ReminderLog,
    ReminderStatus,
    Employee
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
    id:int
    advance_request_id:int
    document_no:str
    employee_name:str
    employee_email:str
    department_email:str
    sent_at:str
    status:str

    class Config:
        from_attributes=True

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
            log.advance_request.employee_name
            if log.advance_request
            else None,

        "employee_email":
            log.employee_email,

        "department_email":
            log.department_email,

        "sent_at":
            log.sent_at.strftime(
                "%Y-%m-%d %H:%M:%S"
            )
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
            AdvanceRequest.status == AdvanceStatus.OVERDUE
        )
        .all()
    )

# CEK EMAIL SUDAH PERNAH TERKIRIM
def reminder_already_sent(
    db: Session,
    advance_id: int
) -> bool:

    log = (

        db.query(ReminderLog)
        .filter(

            ReminderLog.advance_request_id
            == advance_id,

            ReminderLog.status
            == ReminderStatus.SUCCESS

        )
        .first()

    )

    return log is not None

# CEK HARI KERJA
def is_working_day():

    today = date.today()

    # senin =0
    # minggu =6

    return today.weekday() < 5

# Table advance
def build_advance_table(
    advances: List[AdvanceRequest]
) -> str:

    rows = ""

    for advance in advances:

        rows += f"""
        <tr>

        <td
        style="
        padding:8px;
        border:1px solid #dddddd;
        "
        >
        {advance.request_date}
        </td>

        <td
        style="
        padding:8px;
        border:1px solid #dddddd;
        "
        >
        {advance.ppc_no}
        </td>

        <td
        style="
        padding:8px;
        border:1px solid #dddddd;
        "
        >
        {advance.employee_name}
        </td>

        <td
        style="
        padding:8px;
        border:1px solid #dddddd;
        "
        >
        {advance.purpose}
        </td>

        <td
        style="
        padding:8px;
        border:1px solid #dddddd;
        "
        >
        Rp {advance.amount:,.0f}
        </td>
        <td
        style="
        padding:8px;
        border:1px solid #dddddd;
        "
        >
        > 2 Hari
        </td>
        </tr>
        """

    return f"""
    <table
    style="
    width:100%;
    border-collapse:collapse;
    font-family:Arial,sans-serif;
    "
    >

    <thead
    style="
    background-color:#1F4E78;
    color:white;
    "
    >

    <tr>
    <th style="padding:8px;">Tanggal</th>
    <th style="padding:8px;">Nomor PPC</th>
    <th style="padding:8px;">Nama User</th>
    <th style="padding:8px;">Keterangan</th>
    <th style="padding:8px;">Nominal</th>
    <th style="padding:8px;">Status</th>
    </tr>

    </thead>

    <tbody>

    {rows}

    </tbody>

    </table>
    """
# BUILD REMINDER MESSAGE
def build_reminder_message():

    return """
    <p>
        Mohon untuk memberikan update status dokumen
        penyelesaian atas Petty Cash tersebut dan target
        waktu penyelesaian dengan membalas email ini.
    </p>
    <p>
        Silahkan segera submit ke Kasir jika dokumen
        penyelesaian sudah <b>Full Approved</b>.
    </p>
    <p>
        Jika dirasa sudah submit dokumen dan masih
        tertera di list Outstanding tersebut, mohon
        konfirmasi ke Kasir.
    </p>
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
    Retain Finance
    """

# SEND EMAIL
def send_email_reminder(

    employee,
    advances: List[AdvanceRequest],
    db: Session

) -> bool:
    # employee wajib memiliki email
    if not employee.employee_email:

        logger.warning(
            f"Employee {employee.employee_name} "
            "tidak memiliki email."
        )

        return False   

    # Skip jika seluruh PPC hari ini sudah pernah direminder
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


    # Subject
    subject = (

        "[REFCON] Outstanding Settlement Petty Cash"

    )

    # Body Email
    table_html = build_advance_table(
        unsent_advances
    )

    reminder_message = (
        build_reminder_message()
    )

    internal_memo = (
        build_internal_memo()
    )

    body = f"""
    <html>

    <body
    style="
    font-family:Arial,sans-serif;
    line-height:1;
    color:#333333;
    "
    >

    <h2
    style="
    color:#1F4E78;
    margin-bottom:5px;
    "
    >
    [REFCON] - Outstanding Settlement Petty Cash
    </h2>

    <hr>

    <p>
    Kepada Bapak/Ibu
    <b>{employee.employee_name}</b>,
    </p>

    <p>
    Berikut merupakan daftar Petty Cash yang masih
    Outstanding dan belum dilakukan Settlement.
    </p>

    <b>
    Outstanding Petty Cash
    </b>

    <br><br>
    {table_html}
    <br>
    {reminder_message}
    <br>
    {internal_memo}
    <hr>

    </body>
    </html>
    """
    email_sent = False

    try:
        if SMTP_HOST and SMTP_USER:
            msg = MIMEText(
                body,
                "html",
                "utf-8"
            )

            msg["Subject"] = subject
            msg["From"] = (
                f"REFCON Finance <{SMTP_USER}>"
            )
            msg["To"] = (
                employee.employee_email
            )

            if employee.department_email:

                msg["Cc"] = (
                    employee.department_email
                )

            msg["Reply-To"] = SMTP_USER

            msg["MIME-Version"] = "1.0"

            msg["X-Priority"] = "3"

            with smtplib.SMTP(
                SMTP_HOST,
                int(SMTP_PORT)
            ) as smtp:

                smtp.starttls()

                smtp.login(
                    SMTP_USER,
                    SMTP_PASSWORD
                )


                recipients = [
                    employee.employee_email
                ]

                if (
                    employee.department_email
                    and
                    employee.department_email != "-"
                ):

                    recipients.append(
                        employee.department_email
                    )


                smtp.sendmail(
                    SMTP_USER,
                    recipients,
                    msg.as_string()
                )


            email_sent = True
        else:

            logger.info(
                "[SIMULASI EMAIL]"
            )

            logger.info(subject)
            logger.info(body)

            email_sent = True
    except Exception as e:
        logger.exception(e)
        email_sent = False

    for advance in unsent_advances:
        log = ReminderLog(
            advance_request_id=
                advance.id,
            employee_email=
                employee.employee_email,
            department_email=
                employee.department_email
                if employee.department_email
                else "-",
            status=(
                ReminderStatus.SUCCESS
                if email_sent
                else ReminderStatus.FAILED
            ),
            sent_at=datetime.now()
        )

        db.add(log)
    db.commit()
    return email_sent

# MAIN REMINDER PROCESS
def run_reminder_process(
    db: Session
):

    logger.info(
        "Reminder Process Started"
    )

    # hanya hari kerja
    if not is_working_day():

        return {
            "message":
                "Hari ini bukan hari kerja.",
            "marked_overdue":
                0,
            "total_overdue":
                0,
            "email_sent":
                0,
            "email_email_failed":
                0
        }

    # ACTIVE -> OVERDUE
    marked = (
        update_overdue_advances(
            db
        )
    )

    # ambil seluruh PPC overdue
    overdue_advances = (
        get_overdue_advances(
            db
        )
    )

    logger.info(
        f"Total PPC OVERDUE : "
        f"{len(overdue_advances)}"
    )

    # grouping berdasarkan employee
    grouped_advances = (
        defaultdict(list)
    )

    for advance in overdue_advances:

        grouped_advances[
            advance.employee_name
        ].append(
            advance
        )

    email_sent = 0
    email_failed = 0

    # kirim email
    for employee_name, \
        advances \
        in grouped_advances.items():

        employee = (

            db.query(Employee)
            .filter(

                Employee.employee_name
                == employee_name

            )
            .first()

        )

        # employee tidak ditemukan
        if not employee:

            logger.warning(
                f"Employee "
                f"{employee_name} "
                "tidak ditemukan."
            )

            email_failed += 1
            continue


        # employee tidak memiliki email
        if not employee.employee_email:

            logger.warning(
                f"Employee "
                f"{employee.employee_name} "
                "tidak memiliki email."
            )

            email_failed += 1
            continue


        # kirim email
        if send_email_reminder(

            employee,
            advances,
            db

        ):

            logger.info(
                f"Reminder berhasil "
                f"dikirim ke "
                f"{employee.employee_name}"
            )

            email_sent += 1

        else:

            logger.warning(
                f"Reminder gagal "
                f"dikirim ke "
                f"{employee.employee_name}"
            )

            email_failed += 1


    result = {
        "marked_overdue": marked,
        "total_overdue": len(overdue_advances),
        "email_sent": email_sent,
        "email_failed": email_failed
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
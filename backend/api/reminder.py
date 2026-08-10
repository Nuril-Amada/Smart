import logging
import smtplib
import uuid
from collections import defaultdict
from datetime import date, datetime
from email import utils as email_utils
from email.mime.multipart import MIMEMultipart
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


# ============================================================
# ============================================================
# BUILD EMAIL HTML — Tabel Standar Rapi (Presisi Lebar Kolom Outlook)
# ============================================================
def build_email_html(
    employee,
    advances: List[AdvanceRequest]
) -> str:
    """
    Tabel HTML rapi dengan lebar kolom presisi (width attributes & white-space: nowrap)
    agar di Outlook PC tidak ada teks tanggal/nominal/PPC yang tergulung atau berantakan.
    """
    today_str = date.today().strftime("%d/%m/%Y")

    rows_html = ""
    for adv in advances:
        req_date = adv.request_date
        if isinstance(req_date, (date, datetime)):
            date_formatted = req_date.strftime("%d/%m/%Y")
        else:
            date_formatted = str(req_date)

        try:
            amount_formatted = f"{int(adv.amount):,}".replace(",", ".")
        except (ValueError, TypeError):
            amount_formatted = str(adv.amount)

        rows_html += f"""
    <tr>
      <td width="14%" align="center" style="border: 1px solid #000000; text-align: center; padding: 6px 8px; white-space: nowrap;">{date_formatted}</td>
      <td width="20%" align="center" style="border: 1px solid #000000; text-align: center; padding: 6px 8px; white-space: nowrap;">{adv.ppc_no}</td>
      <td width="20%" align="center" style="border: 1px solid #000000; text-align: center; padding: 6px 8px; white-space: nowrap;">{adv.employee_name}</td>
      <td width="24%" align="center" style="border: 1px solid #000000; text-align: center; padding: 6px 8px;">{adv.purpose}</td>
      <td width="11%" align="center" style="border: 1px solid #000000; text-align: center; padding: 6px 8px; white-space: nowrap;">{amount_formatted}</td>
      <td width="11%" align="center" style="border: 1px solid #000000; text-align: center; padding: 6px 8px; white-space: nowrap;">&gt; 2 Hari</td>
    </tr>"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000000; line-height: 1.5; margin: 0; padding: 15px;">

<p style="margin: 0 0 16px 0;">Kepada Bapak/Ibu {employee.employee_name}</p>

<p style="margin: 0 0 16px 0;">Berikut adalah Uang Muka Petty Cash yang masih outstanding per hari ini {today_str}:</p>

<p style="margin: 0 0 6px 0;"><u>UANG MUKA</u></p>

<table border="1" cellpadding="6" cellspacing="0" width="100%" style="border-collapse: collapse; border: 1px solid #000000; font-family: Arial, Helvetica, sans-serif; font-size: 12px; width: 100%;">
  <thead>
    <tr style="background-color: #ffffff;">
      <th width="14%" align="center" style="border: 1px solid #000000; text-align: center; font-weight: bold; padding: 6px 8px; white-space: nowrap;">Tanggal</th>
      <th width="20%" align="center" style="border: 1px solid #000000; text-align: center; font-weight: bold; padding: 6px 8px; white-space: nowrap;">Nomor PPC</th>
      <th width="20%" align="center" style="border: 1px solid #000000; text-align: center; font-weight: bold; padding: 6px 8px; white-space: nowrap;">Nama User</th>
      <th width="24%" align="center" style="border: 1px solid #000000; text-align: center; font-weight: bold; padding: 6px 8px;">Keterangan</th>
      <th width="11%" align="center" style="border: 1px solid #000000; text-align: center; font-weight: bold; padding: 6px 8px; white-space: nowrap;">Nominal</th>
      <th width="11%" align="center" style="border: 1px solid #000000; text-align: center; font-weight: bold; padding: 6px 8px; white-space: nowrap;">Status</th>
    </tr>
  </thead>
  <tbody>{rows_html}
  </tbody>
</table>

<br>

<p style="margin: 0 0 6px 0;">Mohon untuk memberikan update status dokumen penyelesaian atas petty cash tersebut dan target waktu penyelesaian dengan membalas email ini.</p>
<p style="margin: 0 0 6px 0;">Silahkan segera submit ke kasir jika dokumen penyelesaian sudah Full Approved.</p>
<p style="margin: 0 0 16px 0;">Jika dirasa sudah submit dokumen dan masih tertera di list Outstanding tersebut, mohon konfirmasi ke Kasir.</p>

<p style="margin: 0 0 6px 0;">Internal Memo:</p>
<table border="0" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; margin-bottom: 20px;">
  <tr>
    <td style="vertical-align: top; padding-right: 15px; color: #333333; font-style: italic; white-space: nowrap;">036/BYM-FA/XII/2017</td>
    <td style="vertical-align: top; color: #333333; font-style: italic;">"Uang tunai yang diterima karyawan melalui Petty Cash harus dipertanggungjawabkan maksimum 2 (dua) hari kerja setelah uang diterima."</td>
  </tr>
</table>

<br>

<p style="margin: 0 0 16px 0;">Terima kasih atas perhatian &amp; kerjasamanya.</p>

<p style="margin: 0 0 4px 0;">Best Regards</p>
<p style="margin: 0;">Retained Finance</p>

</body>
</html>
"""


# ============================================================
# BUILD EMAIL TEXT — Plain Text Rapi Padded Column
# ============================================================
def build_email_text(
    employee,
    advances: List[AdvanceRequest]
) -> str:
    """
    Plain Text rapi sejajar dengan perataan spasi presisi.
    """
    today_str = date.today().strftime("%d/%m/%Y")

    headers = ["Tanggal", "Nomor PPC", "Nama User", "Keterangan", "Nominal", "Status"]
    rows_data = []
    for adv in advances:
        req_date = adv.request_date
        if isinstance(req_date, (date, datetime)):
            date_formatted = req_date.strftime("%d/%m/%Y")
        else:
            date_formatted = str(req_date)

        try:
            nominal_str = f"{int(adv.amount):,}".replace(",", ".")
        except (ValueError, TypeError):
            nominal_str = str(adv.amount)

        rows_data.append([
            date_formatted,
            adv.ppc_no,
            adv.employee_name,
            adv.purpose,
            nominal_str,
            "> 2 Hari"
        ])

    widths = [len(h) for h in headers]
    for row in rows_data:
        for c, val in enumerate(row):
            widths[c] = max(widths[c], len(str(val)))

    header_line = "  ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    lines_text = [header_line]
    for row in rows_data:
        line = "  ".join(str(val).ljust(widths[i]) for i, val in enumerate(row))
        lines_text.append(line)

    table_plain = "\n".join(lines_text)

    return f"""Kepada Bapak/Ibu {employee.employee_name}

Berikut adalah Uang Muka Petty Cash yang masih outstanding per hari ini {today_str}:

UANG MUKA
{table_plain}

Mohon untuk memberikan update status dokumen penyelesaian atas petty cash tersebut dan target waktu penyelesaian dengan membalas email ini.
Silahkan segera submit ke kasir jika dokumen penyelesaian sudah Full Approved.
Jika dirasa sudah submit dokumen dan masih tertera di list Outstanding tersebut, mohon konfirmasi ke Kasir.

Internal Memo:
036/BYM-FA/XII/2017    "Uang tunai yang diterima karyawan melalui Petty Cash harus dipertanggungjawabkan maksimum 2 (dua) hari kerja setelah uang diterima."


Terima kasih atas perhatian & kerjasamanya.

Best Regards
Retained Finance
"""


# ============================================================
# SEND EMAIL — MIMEMultipart (Tabel HTML Standar + Plain Text Fallback)
# ============================================================
def send_email_reminder(
    employee,
    advances: List[AdvanceRequest],
    db: Session
) -> bool:
    """Kirim email reminder dengan tabel biasa dan header anti-spam."""

    if not employee.employee_email:
        logger.warning(
            f"Employee {employee.employee_name} tidak memiliki email."
        )
        return False

    unsent_advances = [
        adv for adv in advances
        if not reminder_already_sent(db, adv.id)
    ]

    if not unsent_advances:
        return True

    subject = "[Navicash] Outstanding Settlement Petty Cash"

    html_body = build_email_html(employee, unsent_advances)
    text_body = build_email_text(employee, unsent_advances)

    email_sent = False

    try:
        if SMTP_HOST and SMTP_USER:
            msg = MIMEMultipart("alternative")

            # Header anti-junk / anti-spam
            msg["Subject"]        = subject
            msg["From"]           = f"Navicash Finance <{SMTP_USER}>"
            msg["To"]             = employee.employee_email
            msg["Reply-To"]       = SMTP_USER
            msg["Date"]           = email_utils.formatdate(localtime=True)
            msg["Message-ID"]     = email_utils.make_msgid(
                                        idstring=f"navicash-{uuid.uuid4().hex[:8]}",
                                        domain=SMTP_USER.split("@")[-1]
                                    )
            msg["X-Mailer"]       = "Navicash Finance System"
            msg["Auto-Submitted"] = "auto-generated"

            part1 = MIMEText(text_body, "plain", "utf-8")
            part2 = MIMEText(html_body, "html", "utf-8")
            msg.attach(part1)
            msg.attach(part2)

            recipients = [employee.employee_email]
            if (
                employee.department_email
                and employee.department_email != "-"
            ):
                msg["Cc"] = employee.department_email
                recipients.append(employee.department_email)

            with smtplib.SMTP(SMTP_HOST, int(SMTP_PORT)) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.ehlo()
                smtp.login(SMTP_USER, SMTP_PASSWORD)
                smtp.sendmail(
                    SMTP_USER,
                    recipients,
                    msg.as_string()
                )

            email_sent = True

        else:
            logger.info("[SIMULASI EMAIL]")
            logger.info(f"Subject: {subject}")
            logger.info(html_body)
            email_sent = True

    except Exception as e:
        logger.exception(e)
        email_sent = False

    for advance in unsent_advances:
        log = ReminderLog(
            advance_request_id=advance.id,
            employee_email=employee.employee_email,
            department_email=(
                employee.department_email
                if employee.department_email
                else "-"
            ),
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
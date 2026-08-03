import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("reminder_scheduler")

scheduler = BackgroundScheduler(
    timezone="Asia/Jakarta"
)

# PROSES REMINDER
def reminder_job(
    session_factory: sessionmaker
):

    from api.reminder import run_reminder_process
    logger.info(
        "Reminder Scheduler : menjalankan proses reminder."
    )

    db = session_factory()

    try:
        result = run_reminder_process(
            db
        )
        logger.info(
            f"Reminder Result : {result}"
        )

    except Exception as e:
        logger.exception(e)
    finally:
        db.close()


# ==========================================================
# CEK SAAT STARTUP
# HANYA BERJALAN APABILA JAM = 13.00 WIB
# ==========================================================

def startup_reminder(
    session_factory: sessionmaker
):

    now = datetime.now(
    ZoneInfo(
        "Asia/Jakarta"
    )
)

    if now.hour != 13:
        logger.info(
            "Startup Reminder : bukan pukul 13.00 WIB. Skip."
        )

        return
    logger.info(
        "Startup Reminder : pukul 13.00 WIB. Menjalankan reminder."
    )

    reminder_job(
        session_factory
    )


# START SCHEDULER
def start_reminder_scheduler(
    session_factory: sessionmaker
):

    if scheduler.running:
        return
    scheduler.add_job(
        reminder_job,
        trigger="cron",
        day_of_week="mon-fri",
        hour=13,
        minute=0,
        id="daily_reminder",
        replace_existing=True,
        args=[
            session_factory
        ],
        coalesce=True,
        max_instances=1
    )
    scheduler.start()
    logger.info(
        "Reminder Scheduler aktif "
        "(Mon-Fri 13:00 WIB)"
    )


# STOP SCHEDULER

def stop_reminder_scheduler():

    if scheduler.running:

        scheduler.shutdown(
            wait=False
        )

        logger.info(
            "Reminder Scheduler stopped."
        )

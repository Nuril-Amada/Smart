import logging
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("reminder_scheduler")

scheduler = BackgroundScheduler(
    timezone="Asia/Jakarta"
)

def reminder_job(session_factory: sessionmaker):
    from api.reminder import run_reminder_process
    logger.info(
        "Reminder Scheduler: menjalankan proses reminder."
    )
    db = session_factory()
    try:
        result = run_reminder_process(db)
        logger.info(
            f"Reminder Result : {result}"
        )

    except Exception as e:
        logger.exception(e)

    finally:
        db.close()


def start_reminder_scheduler(
    session_factory: sessionmaker
):
    if scheduler.running:
        return
    scheduler.add_job(
        reminder_job,
        trigger="cron",
        day_of_week="mon-fri",
        hour=8,
        minute=0,
        id="daily_reminder",
        replace_existing=True,
        args=[session_factory],
        coalesce=True,
        max_instances=1
    )

    scheduler.start()
    logger.info(
        "Reminder Scheduler aktif (Mon-Fri 08:00 WIB)"
    )


def stop_reminder_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info(
            "Reminder Scheduler stopped"
        )
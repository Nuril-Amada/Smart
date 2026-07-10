import logging
from sqlalchemy.orm import sessionmaker
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger("reminder_scheduler")

# Scheduler Global
scheduler = BackgroundScheduler(timezone="Asia/Jakarta")


# JOB
def reminder_job(session_factory: sessionmaker):
    """
    Job yang dijalankan scheduler untuk memproses reminder
    advance yang telah melewati due date.
    """

    from api.reminder import run_reminder_process

    logger.info(
        "Scheduler: Memulai pemindaian overdue advance..."
    )

    db = session_factory()

    try:
        result = run_reminder_process(db)

        logger.info(
            f"Scheduler selesai. Hasil: {result}"
        )

    except Exception as e:

        logger.exception(
            f"Scheduler gagal menjalankan reminder: {e}"
        )

    finally:

        db.close()


# START SCHEDULER
def start_reminder_scheduler(
    session_factory: sessionmaker,
):
    """
    Menjalankan APScheduler.
    Scheduler hanya dibuat satu kali.
    """

    if scheduler.running:
        logger.info("Reminder scheduler sudah berjalan.")
        return

    scheduler.add_job(
        func=reminder_job,
        trigger="cron",
        day_of_week="mon-fri",
        hour=8,
        minute=0,
        args=[session_factory],
        id="daily_overdue_reminder",
        replace_existing=True,
    )

    scheduler.start()

    logger.info(
        "Reminder Scheduler aktif. Job dijalankan setiap hari pukul 08:00 WIB."
    )

# STOP SCHEDULER
def stop_reminder_scheduler():
    """
    Menghentikan scheduler ketika aplikasi shutdown.
    """

    if scheduler.running:

        scheduler.shutdown(wait=False)

        logger.info("Reminder Scheduler dihentikan.")
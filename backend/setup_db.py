"""
Script setup database REFCON.
Jalankan sekali saja sebelum pertama kali menggunakan aplikasi.
Akan membuat: database refcon_db, user refcon_user, dan semua tabel.
"""
import pymysql

# =============================================
# 1. Buat Database dan User via root
# =============================================
print("=" * 50)
print("SETUP DATABASE REFCON")
print("=" * 50)

try:
    conn = pymysql.connect(host="localhost", port=3306, user="root", password="")
    cursor = conn.cursor()

    cursor.execute(
        "CREATE DATABASE IF NOT EXISTS refcon_db "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    print("[OK] Database refcon_db dibuat")

    cursor.execute(
        "CREATE USER IF NOT EXISTS 'refcon_user'@'localhost' "
        "IDENTIFIED BY 'refcon123'"
    )
    cursor.execute(
        "GRANT ALL PRIVILEGES ON refcon_db.* TO 'refcon_user'@'localhost'"
    )
    cursor.execute("FLUSH PRIVILEGES")
    print("[OK] User refcon_user dibuat dan diberi akses")

    conn.commit()
    conn.close()

except Exception as e:
    print(f"[ERROR] Setup user/database gagal: {e}")
    raise

# =============================================
# 2. Buat Semua Tabel via SQLAlchemy
# =============================================
from database.connection import Base, engine
from database.models import (
    Transaction,
    GlAccount,
    Employee,
    AdvanceRequest,
    Check,
    ReminderLog
)

print("\nMembuat tabel...")
Base.metadata.create_all(bind=engine)
print("[OK] Semua tabel berhasil dibuat:")
print("     - transactions")
print("     - gl_accounts")
print("     - employees")
print("     - advance_requests")
print("     - checks")
print("     - reminder_logs")

print("\n" + "=" * 50)
print("SETUP SELESAI! Aplikasi siap digunakan.")
print("=" * 50)

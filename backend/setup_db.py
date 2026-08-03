import pymysql
# Buat Database dan User via root
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

# 2. Buat Semua Tabel via SQLAlchemy
from database.connection import Base, engine
print("\nMembuat tabel...")
Base.metadata.create_all(bind=engine)
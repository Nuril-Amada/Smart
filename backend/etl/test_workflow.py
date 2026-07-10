# """
# Test ETL Pipeline - Jalankan dari folder backend/
# Command: ..\.venv\Scripts\python.exe etl\test_workflow.py
# """
# import sys
# from pathlib import Path

# # Pastikan root backend ada di sys.path
# sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# from database.connection import SessionLocal
# from etl.pipeline import run_pipeline

# # =============================================
# # Ganti nama file sesuai file Excel SAP kamu
# # =============================================
# FILE_PATH = Path(__file__).resolve().parents[1] / "uploads" / "SAP_JULI_2025.xlsx"

# print("=" * 60)
# print("TEST ETL PIPELINE - REFCON")
# print("=" * 60)
# print(f"File : {FILE_PATH}")

# if not FILE_PATH.exists():
#     print(f"\n[ERROR] File tidak ditemukan: {FILE_PATH}")
#     print("Pastikan file Excel ada di folder uploads/")
#     sys.exit(1)

# db = SessionLocal()

# try:
#     result = run_pipeline(str(FILE_PATH), db)
#     print("\nHASIL:")
#     for key, value in result.items():
#         print(f"  {key}: {value}")
#     print("\n[OK] TEST BERHASIL")
# except Exception as e:
#     print(f"\n[ERROR] {e}")
#     db.rollback()
# finally:
#     db.close()
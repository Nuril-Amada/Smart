from etl.reader import read_excel
from etl.transformer import transform_data
from etl.loader import load_to_db


def run_pipeline(file_path, db):
    try:
        # READ
        df = read_excel(file_path)

        if df is None or df.empty:
            return {
                "message": "No data found in file",
                "rows": 0
            }

        # TRANSFORM
        df = transform_data(df)

        # LOAD
        result = load_to_db(df, db)

        return {
            "message": "Import Success",
            "rows": len(df),
            "inserted": result["inserted"],
            "skipped": result["skipped"]
        }

    except Exception as e:
        return {
            "message": "ETL failed",
            "error": str(e)
        }
from etl.utils.sap_column_mapper import map_columns
from etl.utils.validator import validate_columns
import pandas as pd

def transform_data(df):

    # Mapping nama kolom
    df = map_columns(df)

    # Validasi
    validate_columns(df)

    # Drop Bank in Transit
    df = df[
        ~df["transaction_type"]
        .astype(str)
        .str.strip()
        .str.upper()
        .eq("BANK IN TRANSIT")
    ]

    # Date
    df["posting_date"] = pd.to_datetime(
        df["posting_date"],
        dayfirst=True,
        errors="coerce"
    )
    df = df.dropna(subset=["posting_date"])

    # Amount
    df["amount"] = (
        df["amount"]
        .astype(str)
        .str.replace(",", "")
    )

    df["amount"] = pd.to_numeric(
        df["amount"],
        errors="coerce"
    ).fillna(0)

    # Month & Year
    df["month"] = df["posting_date"].dt.month

    df["year"] = df["posting_date"].dt.year

    return df

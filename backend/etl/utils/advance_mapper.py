import pandas as pd


COLUMN_MAPPING = {
    "TANGGAL": "request_date",
    "NO PPC": "ppc_no",
    "NAMA USER": "employee_name",
    "Cost Center": "cost_center",
    "KETERANGAN": "purpose",
    "JUMLAH": "amount",
    "SOURCE": "source",
    "Due Date": "due_date",
}


def map_columns(df: pd.DataFrame) -> pd.DataFrame:

    df.columns = df.columns.str.strip()

    df = df.rename(columns=COLUMN_MAPPING)

    required_columns = [
        "request_date",
        "ppc_no",
        "employee_name",
        "cost_center",
        "purpose",
        "amount",
        "due_date",
    ]

    missing = [
        col
        for col in required_columns
        if col not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Kolom tidak ditemukan: {', '.join(missing)}"
        )

    df = df.copy()

    df = df.dropna(how="all")

    string_columns = [
        "ppc_no",
        "employee_name",
        "cost_center",
        "purpose",
        "source",
    ]

    for col in string_columns:

        if col in df.columns:

            df[col] = (
                df[col]
                .fillna("")
                .astype(str)
                .str.strip()
            )

    df["request_date"] = pd.to_datetime(
        df["request_date"],
        dayfirst=True,
        errors="coerce"
    ).dt.date

    df["due_date"] = pd.to_datetime(
        df["due_date"],
        dayfirst=True,
        errors="coerce"
    ).dt.date

    df["amount"] = (
        df["amount"]
        .astype(str)
        .str.replace(",", "", regex=False)
        .str.replace(" ", "", regex=False)
    )

    df["amount"] = pd.to_numeric(
        df["amount"],
        errors="coerce"
    )

    return df
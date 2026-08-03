import pandas as pd


COLUMN_MAPPING = {

    "Nama": "employee_name",
    "Email user": "employee_email",
    "Email Department": "department_email",

}


def map_columns(df: pd.DataFrame):

    # Hapus spasi pada nama kolom
    df.columns = df.columns.str.strip()

    # Rename kolom
    df = df.rename(columns=COLUMN_MAPPING)

    required_columns = [

        "employee_name",
        "employee_email",
        "department_email"

    ]

    missing = [

        col
        for col in required_columns
        if col not in df.columns

    ]

    if missing:

        raise ValueError(
            f"Kolom tidak ditemukan : {missing}"
        )

    # Ambil kolom yang diperlukan
    df = df[required_columns]

    # Hapus baris kosong
    df = df.dropna(how="all")

    # Cleaning string
    for col in required_columns:

        df[col] = (

            df[col]
            .fillna("")
            .astype(str)
            .str.strip()

        )

    return df
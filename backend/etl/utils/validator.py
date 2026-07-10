REQUIRED_COLUMNS = [
    "posting_date",
    "document_no",
    "amount",
    "currency",
    "gl_account",
    "cost_center",
    "reference",
    "transaction_type"
]


def validate_columns(df):

    missing = []

    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            missing.append(col)

    if missing:
        raise Exception(
            f"Required column(s) not found: {', '.join(missing)}"
        )
    
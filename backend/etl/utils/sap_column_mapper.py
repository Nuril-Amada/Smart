import re

# ==========================================================
# Mapping kolom SAP
# ==========================================================

COLUMN_MAPPING = {

    "posting_date": [
        "doc date",
        "doc. date",
        "posting date",
        "posting_date",
        "postingdate"
    ],

    "document_no": [
        "documentno",
        "document no",
        "document_no",
        "document number",
        "document_number",
        "DocumentNo"
    ],

    "amount": [
        "amount in doc. curr.",
        "amount in doc curr",
        "amount_in_doc_curr",
        "amount",
        "DC amount"
    ],

    "currency": [
        "curr",
        "currency",
        "Curr."
    ],

    "gl_account": [
        "g/l acct",
        "g_l_acct",
        "gl account",
        "gl_account"
    ],

    "cost_center": [
        "cost ctr",
        "cost_ctr",
        "cost center",
        "cost_center",
        "Cost Ctr"
    ],

    "reference": [
        "reference"
    ],

    "transaction_type": [
        "document header text",
        "document_header_text",
        "Document Header Text",
        "transaction type"
    ],

    "description": [
        "text",
        "description"
        
    ]
}


def normalize_column(col):
    """
    Normalisasi nama kolom agar fleksibel.

    Contoh:
    ------------------------------------
    Doc. Date          -> doc_date
    G/L acct           -> g_l_acct
    Amount in doc.curr -> amount_in_doc_curr
    Cost Ctr           -> cost_ctr
    """

    col = str(col).strip().lower()

    col = re.sub(r'[^a-z0-9]+', '_', col)

    col = re.sub(r'_+', '_', col)

    return col.strip("_")


def map_columns(df):
    """
    Mengubah nama kolom Excel SAP
    menjadi nama standar aplikasi.
    """

    rename_dict = {}

    for original in df.columns:

        normalized = normalize_column(original)

        for standard_name, aliases in COLUMN_MAPPING.items():

            aliases_normalized = [
                normalize_column(alias)
                for alias in aliases
            ]

            if normalized in aliases_normalized:
                rename_dict[original] = standard_name
                break

    return df.rename(columns=rename_dict)
import re

# Mapping Kolom Settlement Finance
COLUMN_MAPPING = {

    "transaction_date": [
        "tanggal",
        "transaction date",
        "transaction_date",
        "posting date"
    ],

    "ppc_no": [
        "no ppc",
        "ppc",
        "ppc no",
        "ppc_no",
        "ppc number",
        "ppc_number"
    ],

    "employee_name": [
        "nama user",
        "nama",
        "employee",
        "employee name",
        "employee_name",
        "user"
    ],

    "cost_center": [
        "cost center",
        "cost_center",
        "cost ctr",
        "cost_ctr"
    ],

    "description": [
        "keterangan",
        "description",
        "remark",
        "remarks",
        "note"
    ],

    "settlement_amount": [
        "jumlah",
        "amount",
        "total amount",
        "settlement amount",
        "settlement_amount",
        "nominal",
        "total"
    ],

    "source": [
        "source",
        "type",
        "jenis"
    ],

    "due_date": [
        "due date",
        "due_date"
    ],

    "settlement_date": [
        "tgl penyelesaian",
        "tanggal penyelesaian",
        "tgl penyelesaian ",
        "completion date",
        "completion_date",
        "settlement date",
        "settlement_date"
    ]
}


# Normalisasi Nama Kolom
def normalize_column(col):
    """
    Contoh:

    NO PPC
    -> no_ppc

    Tgl Penyelesaian
    -> tgl_penyelesaian

    EMAIL USER
    -> email_user
    """

    col = str(col).strip().lower()

    col = re.sub(r"[^a-z0-9]+", "_", col)

    col = re.sub(r"_+", "_", col)

    return col.strip("_")


# Mapping
def map_columns(df):

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
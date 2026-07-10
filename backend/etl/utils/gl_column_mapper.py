import re

COLUMN_MAPPING = {
    "gl_account": [
        "gl account",
        "g/l acct",
        "g_l_acct",
        "gl_account",
        "account",
        "kode gl",
        "kode_gl"
    ],

    "nama_gl_account": [
        "nama gl account",
        "nama_gl_account",
        "description",
        "account name",
        "gl name",
        "nama account",
        "nama akun"
    ]
}


def normalize_column(col):
    """
    Normalisasi nama kolom:
    - lowercase
    - hilangkan karakter selain huruf & angka
    - ubah spasi menjadi underscore
    """

    col = col.strip().lower()
    col = re.sub(r'[^a-z0-9]+', '_', col)
    col = re.sub(r'_+', '_', col)

    return col.strip("_")


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

from database.models import (
    Transaction,
    TransactionPerak,
)
from etl.utils.normalizer import normalize_code

# PILIH MODEL BERDASARKAN SOURCE
def get_transaction_model(source):

    if source == "perak":
        return TransactionPerak

    return Transaction


# LOAD DATA KE DATABASE
def load_to_db(
    df,
    source,
    db
):

    TransactionModel = get_transaction_model(
        source
    )

    inserted = 0
    skipped = 0

    for _, row in df.iterrows():

        posting_date = (
            row["posting_date"].date()
            if hasattr(
                row["posting_date"],
                "date"
            )
            else row["posting_date"]
        )

        document_no = normalize_code(
            row.get(
                "document_no",
                ""
            )
        )

        amount = round(
            float(
                row.get(
                    "amount",
                    0
                )
            ),
            2
        )

        currency = str(
            row.get(
                "currency",
                ""
            )
        ).strip()

        gl_account = normalize_code(
            row.get(
                "gl_account",
                ""
            )
        )

        cost_center = normalize_code(
            row.get(
                "cost_center",
                ""
            )
        )

        reference = normalize_code(
            row.get(
                "reference",
                ""
            )
        )

        transaction_type = str(
            row.get(
                "transaction_type",
                ""
            )
        ).strip()

        description = str(
            row.get(
                "description",
                ""
            )
        ).strip()

        # SKIP JIKA DATA PENTING KOSONG
        if not document_no:
            skipped += 1
            continue

        if not gl_account:
            skipped += 1
            continue

        # CEK DUPLIKAT
        # Duplicate hanya dicek pada tabel yang sesuai dengan source
        existing = (
            db.query(
                TransactionModel
            )
            .filter(
                TransactionModel.document_no
                == document_no,

                TransactionModel.posting_date
                == posting_date,
            )
            .first()
        )

        # JIKA DUPLIKAT -> SKIP
        if existing:
            skipped += 1
            continue

        # INSERT DATA BARU

        transaction = TransactionModel(

            posting_date=posting_date,
            document_no=document_no,
            amount=amount,
            currency=currency,
            gl_account=gl_account,
            cost_center=cost_center,
            reference=reference,
            transaction_type=transaction_type,
            description=description,
            month=int(
                row["month"]
            ),
            year=int(
                row["year"]
            ),

        )

        db.add(
            transaction
        )

        inserted += 1

    db.commit()
    return {
        "inserted": inserted,
        "skipped": skipped
    }
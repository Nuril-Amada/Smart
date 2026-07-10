from database.models import Transaction


def load_to_db(df, db):

    inserted = 0
    skipped = 0

    for _, row in df.iterrows():

        posting_date = (
            row["posting_date"].date()
            if hasattr(row["posting_date"], "date")
            else row["posting_date"]
        )

        document_no = str(row.get("document_no", ""))
        amount = float(row.get("amount", 0))
        currency = str(row.get("currency", ""))
        gl_account = str(row.get("gl_account", ""))
        cost_center = str(row.get("cost_center", ""))
        reference = str(row.get("reference", ""))
        transaction_type = str(row.get("transaction_type", ""))
        description = str(row.get("description", ""))

        # ====================================================
        # Cek apakah transaksi sudah pernah diimport
        # ====================================================

        existing = (
            db.query(Transaction)
            .filter(
                Transaction.document_no == document_no,
                Transaction.posting_date == posting_date,
                Transaction.gl_account == gl_account,
                Transaction.cost_center == cost_center,
                Transaction.amount == amount
            )
            .first()
        )

        if existing:
            skipped += 1
            continue

        transaction = Transaction(
            posting_date=posting_date,
            document_no=document_no,
            amount=amount,
            currency=currency,
            gl_account=gl_account,
            cost_center=cost_center,
            reference=reference,
            transaction_type=transaction_type,
            description=description,
            month=int(row["month"]),
            year=int(row["year"])
        )

        db.add(transaction)
        inserted += 1

    db.commit()

    return {
        "inserted": inserted,
        "skipped": skipped
    }
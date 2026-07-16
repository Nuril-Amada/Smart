from sqlalchemy.orm import Session
from database.models import GlAccount

def load_gl(df, db: Session):

    total = len(df)

    inserted = 0
    updated = 0
    unchanged = 0

    for _, row in df.iterrows():

        from etl.utils.normalizer import (normalize_code)
        gl_account = normalize_code(
            row["gl_account"]
        )
        nama_gl_account = str(row["nama_gl_account"]).strip()
        existing = (
            db.query(GlAccount)
            .filter(GlAccount.gl_account == gl_account)
            .first()
        )

        if existing:

            if existing.nama_gl_account != nama_gl_account:
                existing.nama_gl_account = nama_gl_account
                updated += 1
            else:
                unchanged += 1

            continue

        db.add(
            GlAccount(
                gl_account=gl_account,
                nama_gl_account=nama_gl_account
            )
        )

        inserted += 1

    db.commit()

    return {
        "total": total,
        "inserted": inserted,
        "updated": updated,
        "unchanged": unchanged
    }
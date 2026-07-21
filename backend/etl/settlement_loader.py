import pandas as pd

from database.models import (
    Employee,
    Settlement,
    SettlementSource,
)


def clean_string(value):

    if pd.isna(value):
        return None

    value = str(value).strip()

    if value == "" or value == "-":
        return None

    return value


def clean_amount(value):

    if pd.isna(value):
        return 0

    if isinstance(value, (int, float)):
        return float(value)

    value = (
        str(value)
        .replace(",", "")
        .replace(" ", "")
    )

    return float(value)


def clean_date(value):

    if pd.isna(value):
        return None

    return pd.to_datetime(
        value,
        dayfirst=True,
        errors="coerce"
    ).date()


def normalize_source(value):

    value = clean_string(value)

    if not value:
        return None

    value = value.upper()

    if value == "ADVANCE":
        return SettlementSource.ADVANCE

    return SettlementSource.REIMBURSEMENT


def load_settlement(df, db):

    inserted = 0
    skipped = 0
    errors = []

    for _, row in df.iterrows():

        ppc_no = clean_string(
            row.get("ppc_no")
        )

        if not ppc_no:

            skipped += 1
            continue

        exist = (
            db.query(Settlement)
            .filter(
                Settlement.ppc_no == ppc_no
            )
            .first()
        )

        if exist:

            skipped += 1
            continue

        employee_name = clean_string(
            row.get("employee_name")
        )

        employee = (
            db.query(Employee)
            .filter(
                Employee.employee_name == employee_name
            )
            .first()
        )

        if not employee:

            skipped += 1

            errors.append(
                f"Employee '{employee_name}' tidak ditemukan."
            )

            continue

        transaction_date = clean_date(
            row.get("transaction_date")
        )

        settlement_date = clean_date(
            row.get("settlement_date")
        )

        if settlement_date is None:
            settlement_date = transaction_date

        settlement = Settlement(

            ppc_no=ppc_no,
            source=normalize_source(
                row.get("source")
            ),
            settlement_date=settlement_date,
            employee_name=employee_name,
            cost_center=clean_string(
                row.get("cost_center")
            ) or "-",
            description=clean_string(
                row.get("description")
            ),
            settlement_amount=clean_amount(
                row.get("settlement_amount")
            )

        )

        db.add(settlement)

        inserted += 1

    db.commit()

    return {

        "inserted": inserted,
        "skipped": skipped,
        "errors": errors

    }
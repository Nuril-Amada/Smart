import pandas as pd

from database.models import (
    Employee,
    Settlement,
    SettlementSource,
)


# Helper
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


# Loader
def load_settlement(df, db):

    inserted = 0
    skipped = 0

    for _, row in df.iterrows():

        ppc_no = clean_string(row.get("ppc_no"))

        if not ppc_no:
            skipped += 1
            continue

        # Duplicate PPC
        exist = (
            db.query(Settlement)
            .filter(Settlement.ppc_no == ppc_no)
            .first()
        )

        if exist:
            skipped += 1
            continue

        # Employee

        employee_name = clean_string(
            row.get("employee_name")
        )

        employee_email = clean_string(
            row.get("email")
        )

        employee = None

        if employee_email:

            employee = (
                db.query(Employee)
                .filter(
                    Employee.employee_email == employee_email
                )
                .first()
            )

        if employee is None and employee_name:

            employee = (
                db.query(Employee)
                .filter(
                    Employee.employee_name == employee_name
                )
                .first()
            )

        if employee is None:

            employee = Employee(

                employee_id=f"IMPORT-{ppc_no}",

                employee_name=employee_name
                or "UNKNOWN",

                employee_email=employee_email
                or "-"
            )

            db.add(employee)
            db.flush()

        # Settlement
        # Tentukan settlement date
        settlement_date = clean_date(
            row.get("settlement_date")
        )

        # Jika reimbursement tidak punya settlement date,
        # gunakan tanggal transaksi
        if settlement_date is None:
            settlement_date = clean_date(
                row.get("transaction_date")
            )

        raw_transaction = row.get("transaction_date")
        raw_settlement = row.get("settlement_date")

        transaction_date = clean_date(raw_transaction)
        settlement_date = clean_date(raw_settlement)

        if settlement_date is None:
            settlement_date = transaction_date

        print(
            f"PPC={ppc_no}",
            f"raw_settlement={raw_settlement}",
            f"parsed_settlement={settlement_date}",
        )

        settlement = Settlement(
            ppc_no=ppc_no,
            source=normalize_source(row.get("source")),
            employee_id=employee.id,
            settlement_date=settlement_date,
            cost_center=clean_string(row.get("cost_center")) or "-",
            email=employee.employee_email,
            description=clean_string(row.get("description")),
            settlement_amount=clean_amount(row.get("settlement_amount"))
        )

        db.add(settlement)

        inserted += 1

    db.commit()

    return {

        "inserted": inserted,

        "skipped": skipped
    }
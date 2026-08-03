from database.models import (
    AdvanceRequest,
    AdvanceStatus,
    Employee,
)


def load_advance(df, db):

    inserted = 0
    skipped = 0
    failed = 0
    errors = []

    for index, row in df.iterrows():

        try:

            ppc_no = row["ppc_no"]
            employee_name = row["employee_name"]
            request_date = row["request_date"]
            cost_center = row["cost_center"]
            purpose = row["purpose"]
            amount = row["amount"]
            due_date = row["due_date"]
            source = row.get("source", "")

            if str(source).strip().lower() != "advance":

                skipped += 1
                continue

            exists = (
                db.query(AdvanceRequest)
                .filter(
                    AdvanceRequest.ppc_no == ppc_no
                )
                .first()
            )

            if exists:

                skipped += 1

                errors.append(
                    f"{ppc_no} sudah tersedia."
                )

                continue

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

            if due_date < request_date:

                skipped += 1

                errors.append(
                    f"{ppc_no} memiliki due date tidak valid."
                )

                continue

            advance = AdvanceRequest(

                ppc_no=ppc_no,
                employee_name=employee_name,
                request_date=request_date,
                cost_center=cost_center,
                purpose=purpose,
                amount=amount,
                due_date=due_date,
                status=AdvanceStatus.ACTIVE

            )

            db.add(advance)

            inserted += 1

        except Exception as e:

            failed += 1

            errors.append(
                f"Baris {index + 2}: {str(e)}"
            )

    db.commit()

    return {

        "rows": len(df),
        "inserted": inserted,
        "skipped": skipped,
        "failed": failed,
        "errors": errors

    }
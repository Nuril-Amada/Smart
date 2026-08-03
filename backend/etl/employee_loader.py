from database.models import Employee


def load_employee(df, db):

    inserted = 0
    updated = 0

    for _, row in df.iterrows():

        employee_name = row["employee_name"]
        employee_email = row["employee_email"]
        department_email = row["department_email"]

        # Cari employee berdasarkan nama
        employee = (

            db.query(Employee)
            .filter(
                Employee.employee_name == employee_name
            )
            .first()

        )

        # Update data lama
        if employee:

            employee.employee_email = employee_email
            employee.department_email = department_email

            updated += 1

        # Insert employee baru
        else:

            employee = Employee(

                employee_name=employee_name,
                employee_email=employee_email,
                department_email=department_email

            )

            db.add(employee)

            inserted += 1

    db.commit()

    return {

        "rows": len(df),
        "inserted": inserted,
        "updated": updated

    }
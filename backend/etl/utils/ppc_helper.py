from datetime import date
from sqlalchemy.orm import Session
from database.models import PpcSequence, AdvanceRequest, Settlement
from sqlalchemy import func

# MONTH TO ROMAN
def month_to_roman(month: int) -> str:
    roman_months = {
        1: "I",
        2: "II",
        3: "III",
        4: "IV",
        5: "V",
        6: "VI",
        7: "VII",
        8: "VIII",
        9: "IX",
        10: "X",
        11: "XI",
        12: "XII",
    }

    return roman_months[month]

# GET NEXT SEQUENCE
def get_next_ppc_sequence(db: Session, year: int) -> int:
    # 1. Query max sequence dari PpcSequence (audit log)
    seq_from_history = (
        db.query(func.max(PpcSequence.sequence))
        .filter(PpcSequence.year == year)
        .scalar()
    ) or 0

    # 2. Safety fallback: Query max sequence dari AdvanceRequest
    existing_advances = (
        db.query(AdvanceRequest.ppc_no)
        .filter(AdvanceRequest.ppc_no.like(f"%/{year}"))
        .all()
    )
    max_adv_seq = 0
    for item in existing_advances:
        if item[0]:
            try:
                max_adv_seq = max(max_adv_seq, int(item[0].split("/")[0]))
            except Exception:
                pass

    # 3. Safety fallback: Query max sequence dari Settlement
    existing_settlements = (
        db.query(Settlement.ppc_no)
        .filter(Settlement.ppc_no.like(f"%/{year}"))
        .all()
    )
    max_settle_seq = 0
    for item in existing_settlements:
        if item[0]:
            try:
                max_settle_seq = max(max_settle_seq, int(item[0].split("/")[0]))
            except Exception:
                pass

    return max(seq_from_history, max_adv_seq, max_settle_seq) + 1

# RECORD PPC SEQUENCE
def record_ppc_sequence(db: Session, ppc_no: str, year: int, sequence: int):
    existing = (
        db.query(PpcSequence)
        .filter(PpcSequence.ppc_no == ppc_no)
        .first()
    )
    if not existing:
        seq_record = PpcSequence(
            ppc_no=ppc_no,
            year=year,
            sequence=sequence
        )
        db.add(seq_record)

# GENERATE PPC NUMBER
# FORMAT: {sequence}/PPC/{roman_month}/{year}
def generate_ppc_no(
    db: Session,
    request_date: date,
    record_sequence: bool = False,
) -> str:
    year = request_date.year
    roman_month = month_to_roman(request_date.month)

    next_sequence = get_next_ppc_sequence(db, year)
    ppc_no = f"{next_sequence}/PPC/{roman_month}/{year}"

    if record_sequence:
        record_ppc_sequence(
            db=db,
            ppc_no=ppc_no,
            year=year,
            sequence=next_sequence
        )

    return ppc_no

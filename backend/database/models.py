from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Enum,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base

# ENUM
class AdvanceType(str, PyEnum):
    PPC = "PPC"      # <= 1 juta
    PAM = "PAM"      # > 1 juta
class AdvanceStatus(str, PyEnum):
    ACTIVE = "ACTIVE"
    OVERDUE = "OVERDUE"
    SETTLED = "SETTLED"
class ReminderStatus(str, PyEnum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
class SettlementSource(str, PyEnum):
    ADVANCE = "ADVANCE"
    REIMBURSEMENT = "REIMBURSEMENT"

# TRANSACTIONS
class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    posting_date = Column(Date, nullable=False)
    document_no = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False)
    gl_account = Column(String(20), nullable=False)
    cost_center = Column(String(30))
    reference = Column(String(100))
    transaction_type = Column(String(100))
    description = Column(String(255))
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    uploaded_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "document_no",
            "posting_date",
            name="uq_transaction_key"
        ),
    )

#  GL ACCOUNT
class GlAccount(Base):
    __tablename__ = "gl_accounts"
    id = Column(Integer, primary_key=True, index=True)
    gl_account = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )
    nama_gl_account = Column(
        String(255),
        nullable=False
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

# EMPLOYEE
class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(
        String(30),
        unique=True,
        nullable=False
    )
    employee_name = Column(
        String(100),
        nullable=False
    )
    employee_email = Column(
        String(100),
        nullable=False
    )
    created_at = Column(
        DateTime,
        server_default=func.now()
    )
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )
    advance_requests = relationship(
        "AdvanceRequest",
        back_populates="employee"
    )
    settlements = relationship(
        "Settlement",
        back_populates="employee"
    )

# ADVANCE REQUEST
class AdvanceRequest(Base):
    __tablename__ = "advance_requests"
    id = Column(
        Integer,
        primary_key=True,
        index=True
    )
    advance_type = Column(
        Enum(AdvanceType),
        nullable=False
    )
    ppc_no = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )
    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )
    request_date = Column(
        Date,
        nullable=False
    )
    cost_center = Column(
        String(50),
        nullable=False
    )
    email = Column(
        String(100),
        nullable=True
    )
    purpose = Column(
        String(255),
        nullable=False
    )
    amount = Column(
        Float,
        nullable=False
    )
    due_date = Column(
        Date,
        nullable=False
    )
    status = Column(
        Enum(AdvanceStatus),
        default=AdvanceStatus.ACTIVE,
        nullable=False
    )

    # Settlement Information
    settlement_date = Column(
        Date,
        nullable=True
    )

    settlement_document = Column(
        String(50),
        nullable=True
    )

    settlement_amount = Column(
        Float,
        nullable=True
    )

    settlement_note = Column(
        String(255),
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )

    employee = relationship(
        "Employee",
        back_populates="advance_requests"
    )

    reminder_logs = relationship(
        "ReminderLog",
        back_populates="advance_request",
        cascade="all, delete-orphan"
    )

# # CHECK
# class Check(Base):

#     __tablename__ = "checks"


#     id = Column(
#         Integer,
#         primary_key=True,
#         index=True
#     )


#     advance_request_id = Column(
#         Integer,
#         ForeignKey("advance_requests.id"),
#         nullable=True,
#     )


#     settlement_id = Column(
#         Integer,
#         ForeignKey("settlements.id"),
#         nullable=True,
#         unique=True
#     )


#     check_number = Column(
#         String(50),
#         unique=True,
#         nullable=False
#     )


#     print_date = Column(
#         DateTime
#     )


#     printed_by = Column(
#         String(100)
#     )


#     advance_request = relationship(
#         "AdvanceRequest",
#         back_populates="check"
#     )


#     settlement = relationship(
#         "Settlement",
#         back_populates="check"
#     )

# REMINDER LOGS

class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id = Column(Integer, primary_key=True, index=True)

    advance_request_id = Column(
        Integer,
        ForeignKey("advance_requests.id"),
        nullable=False
    )

    email = Column(
        String(100),
        nullable=False
    )

    sent_at = Column(
        DateTime,
        server_default=func.now()
    )

    status = Column(
        Enum(ReminderStatus),
        nullable=False
    )

    advance_request = relationship(
        "AdvanceRequest",
        back_populates="reminder_logs"
    )

# SETTLEMENT
class Settlement(Base):
    __tablename__ = "settlements"
    id = Column(Integer, primary_key=True)
    ppc_no = Column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )
    source = Column(
        Enum(SettlementSource),
        nullable=False
    )
    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )
    settlement_date = Column(
        Date,
        nullable=False
    )
    cost_center = Column(
        String(50),
        nullable=False
    )
    email = Column(
        String(100),
        nullable=False
    )
    description = Column(
        String(255)
    )
    settlement_amount = Column(
        Float,
        nullable=False
    )
    created_at = Column(
        DateTime,
        server_default=func.now()
    )
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )
    employee = relationship(
        "Employee",
        back_populates="settlements"
    )
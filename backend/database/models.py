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
class AdvanceStatus(str, PyEnum):
    ACTIVE = "ACTIVE"
    OVERDUE = "OVERDUE"
    SETTLED = "SETTLED"
    CANCEL = "CANCEL"

class ReminderStatus(str, PyEnum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class SettlementSource(str, PyEnum):
    ADVANCE = "ADVANCE"
    REIMBURSEMENT = "REIMBURSEMENT"

# TRANSACTIONS
class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(
        Integer,
        primary_key=True,
        index=True
    )
    posting_date = Column(
        Date,
        nullable=False
    )
    document_no = Column(
        String(50),
        nullable=False
    )
    amount = Column(
        Float,
        nullable=False
    )
    currency = Column(
        String(10),
        nullable=False
    )
    gl_account = Column(
        String(20),
        nullable=False
    )
    cost_center = Column(
        String(30)
    )
    reference = Column(
        String(100)
    )
    transaction_type = Column(
        String(100)
    )
    description = Column(
        String(255)
    )
    month = Column(
        Integer,
        nullable=False
    )
    year = Column(
        Integer,
        nullable=False
    )
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

# GL ACCOUNT
class GlAccount(Base):
    __tablename__ = "gl_accounts"
    id = Column(
        Integer,
        primary_key=True,
        index=True
    )
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

# EMPLOYEES
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    employee_name = Column(
        String(100),
        unique=True,
        nullable=False
    )

    employee_email = Column(
        String(100),
        nullable=False
    )

    department_email = Column(
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

# ADVANCE REQUEST (PPC)
class AdvanceRequest(Base):
    __tablename__ = "advance_requests"

    id = Column(Integer, primary_key=True, index=True)

    ppc_no = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    request_date = Column(
        Date,
        nullable=False
    )

    employee_name = Column(
        String(100),
        nullable=False
    )

    cost_center = Column(
        String(50),
        nullable=False
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

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )

    reminder_logs = relationship(
        "ReminderLog",
        back_populates="advance_request",
        cascade="all, delete-orphan"
    )

# REMINDER LOG
class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    advance_request_id = Column(
        Integer,
        ForeignKey("advance_requests.id"),
        nullable=False
    )

    employee_email = Column(
        String(100),
        nullable=False
    )

    department_email = Column(
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

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    ppc_no = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    source = Column(
        Enum(SettlementSource),
        nullable=False
    )

    employee_name = Column(
        String(100),
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

    description = Column(
        String(255),
        nullable=True
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
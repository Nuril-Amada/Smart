# Navicash Backend
Backend dibangun menggunakan **FastAPI**, **SQLAlchemy**, dan **MySQL** sebagai database utama.
Sistem ini menangani proses import data SAP, monitoring petty cash, advance, settlement, reminder email, serta pencetakan check.
---

## Tech Stack

- Python 3.12+
- FastAPI
- SQLAlchemy
- MySQL Server 8.0
- PyMySQL
- Pydantic
- APScheduler
- Pandas
- ReportLab
- OpenPyXL
- Uvicorn
---

## Project Structure

```text
backend/
│
├── api/                    # REST API Endpoint
│   ├── advance.py
│   ├── check.py
│   ├── dashboard.py
│   ├── employee.py
│   ├── export.py
│   ├── gl_account.py
│   ├── reminder.py
│   ├── settlement.py
│   ├── upload.py
│   └── vendor.py
│
├── database/
│   ├── connection.py       # SQLAlchemy Engine & Session
│   └── models.py           # Database Model
│
├── etl/
│   ├── utils/
│   ├── loader.py
│   ├── pipeline.py
│   ├── reader.py
│   ├── transformer.py
│   ├── employee_loader.py
│   ├── gl_loader.py
│   ├── advance_loader.py
│   └── settlement_loader.py
│
├── scheduler/
│   └── scheduler.py
│
├── uploads/                # Temporary uploaded files
│
├── config.py               # Environment configuration
├── main.py                 # FastAPI Entry Point
├── setup_db.py             # Database initialization
├── requirements.txt
└── .env
```

---

## Main Features

### Dashboard

- Dashboard Summary
- Monthly Cash Flow
- GL Account Summary
- Cost Center Summary
- Top Cost Center
- Trend Analysis

### Employee

- Search Employee
- Employee Management

### Vendor

- Vendor Management

### GL Account

- GL Account Management

### Advance

- Create PPC
- Cancel PPC
- Delete PPC
- Settlement Advance
- Outstanding Monitoring
- Overdue Monitoring
- PPC Number Generator

### Settlement

- Settlement Management
- Receipt Settlement

### Check

- Create Check
- Delete Check
- Check History

### Upload

- Import SAP Excel
- ETL Processing
- Data Validation

### Reminder

- Automatic Reminder
- Overdue Detection
- Email Notification

### Export

- Dashboard Export
- PDF Export
- Excel Export

---

## Database

Database menggunakan **MySQL Server 8.0**.

Konfigurasi berada pada file `.env`.

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=refcon_db
DB_USER=refcon_user
DB_PASSWORD=********
```

---

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd backend
```

### 2. Create Virtual Environment

```bash
python -m venv .venv
```

Windows

```bash
.venv\Scripts\activate
```

Linux

```bash
source .venv/bin/activate
```

---

### 3. Install Dependency

```bash
pip install -r requirements.txt
```

---

### 4. Configure Environment

Create `.env`

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=refcon_db
DB_USER=refcon_user
DB_PASSWORD=********

APP_HOST=127.0.0.1
APP_PORT=8000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
```

---

### 5. Initialize Database

```bash
python setup_db.py
```

---

### 6. Run Server

```bash
uvicorn main:app --reload
```

Server

```
http://127.0.0.1:8000
```

Swagger Documentation

```
http://127.0.0.1:8000/docs
```

ReDoc

```
http://127.0.0.1:8000/redoc
```

---

## ETL Workflow

```text
SAP Excel

        │

        ▼

Reader

        │

        ▼

Transformer

        │

        ▼

Loader

        │

        ▼

MySQL Database
```

---

## Scheduler

Scheduler menggunakan APScheduler.

Fungsi utama:

- Update status overdue
- Reminder email
- Reminder log

Scheduler dijalankan otomatis ketika aplikasi FastAPI dijalankan.

---

## API Documentation

Swagger UI

```
/docs
```

ReDoc

```
/redoc
```

---

## Development Notes

Backend menggunakan:

- SQLAlchemy ORM
- REST API
- MySQL Server
- Environment Variable (.env)
- Modular ETL Pipeline
- Scheduler untuk proses otomatis

---

## Future Improvements

- Authentication & Authorization
- Audit Log
- Unit Testing
- Docker Deployment
- Apache Production Deployment
- Background Queue (Celery/RQ)

"""Import raw lead_import_raw CSV rows into the CRM leads table.

This script reads backend/scripts/reports/lead_import_raw.csv, parses the JSON payload
from the `data` column, and creates leads through the backend service layer.

Usage:
    cd backend
    $env:DATABASE_URL = 'postgresql://postgres:fundingsathicrm@127.0.0.1:5432/fundingsathicrm'
    .\\.venv\Scripts\python.exe scripts\import_lead_import_raw_csv.py
"""

from __future__ import annotations

import csv
import json
import importlib
import os
import re
import sys
from pathlib import Path
from typing import Any

# Ensure app package is importable from backend working directory.
sys.path.insert(0, os.getcwd())

# Import only the specific ORM modules needed for relationship resolution.
# Avoid importing duplicate model definitions such as app.models.lead_new.
import app.models.user
import app.models.customer_profile
import app.models.timeline
import app.models.lead

from app.database import SessionLocal
from app.models.lead import Lead
from app.schemas.lead import LeadCreate
from app.services.lead_service import create_lead

CSV_PATH = Path("scripts/reports/lead_import_raw.csv")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def normalize_email(value: Any) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    parts = re.split(r"[;,/\\\\]+", text)
    for part in parts:
        candidate = part.strip()
        if EMAIL_RE.match(candidate.lower()):
            return candidate.lower()
    return text.lower() if "@" in text else None


def normalize_mobile(value: Any) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    digits = re.sub(r"[^0-9]", "", text)
    if len(digits) == 0:
        return None
    if len(digits) > 10:
        digits = digits[-10:]
    return digits


def parse_location(value: Any) -> tuple[str | None, str | None]:
    text = normalize_text(value)
    if not text:
        return None, None
    parts = [p.strip() for p in re.split(r"[\n\r,]|\s{2,}", text) if p.strip()]
    if len(parts) >= 2:
        return parts[-1], " ".join(parts[:-1])
    if len(parts) == 1:
        tokens = parts[0].split()
        if len(tokens) >= 2:
            return tokens[-1], " ".join(tokens[:-1])
        return parts[0], None
    return None, None


def parse_amount(value: Any) -> float | None:
    text = normalize_text(value)
    if not text:
        return None
    cleaned = re.sub(r"[^0-9.]", "", text)
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def build_lead_payload(raw: dict[str, Any]) -> dict[str, Any]:
    contact = normalize_text(raw.get("Contact Person Name") or raw.get("Contact Person") or raw.get("contact person name") or raw.get("contact person"))
    company = normalize_text(raw.get("Customer Company Name") or raw.get("Customer Company") or raw.get("customer company name"))
    email = normalize_email(raw.get("Email Address") or raw.get("Email ID") or raw.get("Email") or raw.get("email address") or raw.get("email id"))
    mobile = normalize_mobile(raw.get("Contact Number") or raw.get("Mobile Number") or raw.get("mobile") or raw.get("contact number"))
    city, state = parse_location(raw.get("Location (City, State)") or raw.get("Location") or raw.get("location"))
    product = normalize_text(raw.get("Product/Service Discussed") or raw.get("Product / Service Discussed") or raw.get("Product/Service Discussed"))
    source = normalize_text(raw.get("Lead Source") or raw.get("lead source"))
    status = normalize_text(raw.get("Current Status of Lead") or raw.get("Final Outcome") or raw.get("current status of lead") or raw.get("final outcome"))

    remarks = []
    for key in ("Call Outcome", "Learning / Challenge Faced", "call outcome", "learning / challenge faced"):
        value = normalize_text(raw.get(key))
        if value:
            remarks.append(value)

    lead_name = contact or company or email or mobile or "Imported Lead"
    return {
        "lead_name": lead_name[:255],
        "company_name": company[:255] if company else None,
        "mobile": mobile,
        "alternate_mobile": None,
        "email": email,
        "company_email": None,
        "city": city[:100] if city else None,
        "state": state[:100] if state else None,
        "product_type": product[:100] if product else None,
        "funding_amount": parse_amount(raw.get("Deal Value (If Closed)") or raw.get("Deal Value") or raw.get("deal value")),
        "lead_source": source[:100] if source else None,
        "lead_status": status[:100] if status else "New",
        "assigned_to": None,
        "remarks": " | ".join(remarks)[:1000] if remarks else None,
    }


def main() -> None:
    if not CSV_PATH.exists():
        print("CSV file not found:", CSV_PATH)
        return

    db = SessionLocal()
    inserted = 0
    skipped = 0
    errors = 0
    seen_emails: set[str] = set()
    seen_mobiles: set[str] = set()

    try:
        with CSV_PATH.open(newline="", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            for row in reader:
                row_id = row.get("id") or "<unknown>"
                raw_data = {}
                if row.get("data"):
                    try:
                        raw_data = json.loads(row["data"])
                    except json.JSONDecodeError as exc:
                        print(f"Skipping row {row_id}: invalid JSON in data field: {exc}")
                        errors += 1
                        continue

                payload = build_lead_payload(raw_data)
                if not payload["lead_name"]:
                    payload["lead_name"] = f"Imported Lead {row_id}"[:255]

                email = payload["email"]
                mobile = payload["mobile"]
                skip = False
                if email and email in seen_emails:
                    skip = True
                if mobile and mobile in seen_mobiles:
                    skip = True
                if not skip:
                    if email:
                        existing = db.query(Lead).filter(Lead.email == email).first()
                        if existing:
                            skip = True
                    if not skip and mobile:
                        existing = db.query(Lead).filter(Lead.mobile == mobile).first()
                        if existing:
                            skip = True
                if skip:
                    skipped += 1
                    continue

                try:
                    lead_in = LeadCreate(**payload)
                    create_lead(db, lead_in)
                    inserted += 1
                    if email:
                        seen_emails.add(email)
                    if mobile:
                        seen_mobiles.add(mobile)
                except Exception as exc:
                    print(f"Failed to create lead for row {row_id}: {exc}")
                    db.rollback()
                    errors += 1
    finally:
        db.close()

    print("Import completed.")
    print(f"  inserted = {inserted}")
    print(f"  skipped  = {skipped}")
    print(f"  errors   = {errors}")


if __name__ == "__main__":
    main()

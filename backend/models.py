"""
HISAB — models.py
Lightweight document schemas/helpers for MongoDB collections. Since MongoDB
is schemaless, these are plain-dict "factory" functions plus (de)serializers
that keep the shape of each document consistent across routes.py.
"""

from datetime import datetime, timezone
from bson import ObjectId


def now():
    return datetime.now(timezone.utc)


def oid_str(value):
    """Convert a Mongo ObjectId to string; pass through if already a string."""
    return str(value) if isinstance(value, ObjectId) else value


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
def new_user(email, password_hash, user_type, **kwargs):
    return {
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "user_type": user_type,  # "personal" | "business"
        "first_name": kwargs.get("first_name", ""),
        "last_name": kwargs.get("last_name", ""),
        "business_name": kwargs.get("business_name", ""),
        "pan_number": kwargs.get("pan_number", ""),
        "phone_number": kwargs.get("phone_number", ""),
        "email_verified": False,
        "created_at": now(),
        "updated_at": now(),
        "last_login": None,
        "preferences": {"theme": "light", "language": "en", "notifications": True},
    }


def serialize_user(doc):
    if not doc:
        return None
    return {
        "id": oid_str(doc.get("_id")),
        "email": doc.get("email"),
        "user_type": doc.get("user_type"),
        "first_name": doc.get("first_name", ""),
        "last_name": doc.get("last_name", ""),
        "business_name": doc.get("business_name", ""),
        "pan_number": doc.get("pan_number", ""),
        "phone_number": doc.get("phone_number", ""),
        "email_verified": doc.get("email_verified", False),
        "preferences": doc.get("preferences", {}),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }


# ---------------------------------------------------------------------------
# Transactions (income / expense)
# ---------------------------------------------------------------------------
def new_transaction(user_id, tx_type, category, amount, date, description=""):
    return {
        "user_id": user_id,
        "type": tx_type,  # "income" | "expense"
        "category": category,
        "amount": float(amount),
        "description": description,
        "date": date,
        "created_at": now(),
    }


def serialize_transaction(doc):
    return {
        "id": oid_str(doc.get("_id")),
        "type": doc.get("type"),
        "category": doc.get("category"),
        "amount": doc.get("amount"),
        "description": doc.get("description", ""),
        "date": doc.get("date"),
    }


# ---------------------------------------------------------------------------
# Loans
# ---------------------------------------------------------------------------
def new_loan(user_id, loan_type, equipment_name, amount, purpose, **kwargs):
    return {
        "user_id": user_id,
        "type": loan_type,  # "personal" | "business"
        "equipment_name": equipment_name,
        "amount": float(amount),
        "purpose": purpose,
        "status": "pending",  # pending | approved | rejected | active | paid
        "approval_date": None,
        "disbursement_date": None,
        "due_date": None,
        "interest_rate": kwargs.get("interest_rate", 6.5),
        "repayment_period": kwargs.get("repayment_period", 12),
        "repayment_frequency": kwargs.get("repayment_frequency", "monthly"),
        "daily_repayment": kwargs.get("daily_repayment", 0),
        "expected_roi": kwargs.get("expected_roi", ""),
        "paid_amount": 0,
        "created_at": now(),
    }


def serialize_loan(doc):
    return {
        "id": oid_str(doc.get("_id")),
        "type": doc.get("type"),
        "equipment_name": doc.get("equipment_name"),
        "amount": doc.get("amount"),
        "purpose": doc.get("purpose"),
        "status": doc.get("status"),
        "disbursement_date": doc.get("disbursement_date"),
        "due_date": doc.get("due_date"),
        "interest_rate": doc.get("interest_rate"),
        "repayment_frequency": doc.get("repayment_frequency"),
        "paid_amount": doc.get("paid_amount", 0),
    }


# ---------------------------------------------------------------------------
# Repayments
# ---------------------------------------------------------------------------
def new_repayment(loan_id, amount, date, status="paid"):
    return {
        "loan_id": loan_id,
        "amount": float(amount),
        "date": date,
        "status": status,
        "created_at": now(),
    }


# ---------------------------------------------------------------------------
# Savings goals
# ---------------------------------------------------------------------------
def new_savings_goal(user_id, goal_name, target_amount, deadline):
    return {
        "user_id": user_id,
        "goal_name": goal_name,
        "target_amount": float(target_amount),
        "current_amount": 0,
        "deadline": deadline,
        "created_at": now(),
    }


def serialize_savings_goal(doc):
    return {
        "id": oid_str(doc.get("_id")),
        "goal_name": doc.get("goal_name"),
        "target_amount": doc.get("target_amount"),
        "current_amount": doc.get("current_amount", 0),
        "deadline": doc.get("deadline"),
    }


# ---------------------------------------------------------------------------
# OTPs
# ---------------------------------------------------------------------------
def new_otp(email, otp_code, payload, purpose="register"):
    return {
        "email": email.lower().strip(),
        "otp": otp_code,
        "payload": payload,  # pending registration data, encrypted at rest by DB-level encryption
        "purpose": purpose,  # "register" | "login" | "reset"
        "created_at": now(),
        "attempts": 0,
    }

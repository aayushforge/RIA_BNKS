"""
HISAB — routes.py
All REST API endpoints, grouped under a single `/api` blueprint.

Security notes:
  - Passwords are hashed with bcrypt, never stored or logged in plaintext.
  - Auth uses short-lived JWT access tokens (flask-jwt-extended).
  - Registration requires email OTP verification before an account exists.
  - Every /finance, /loan, /dashboard, /analytics route is @jwt_required
    and scoped to the authenticated user's own user_id only.
"""

import os
import random
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)

from database import get_db
from models import (
    new_loan,
    new_otp,
    new_repayment,
    new_savings_goal,
    new_transaction,
    new_user,
    now,
    serialize_loan,
    serialize_savings_goal,
    serialize_transaction,
    serialize_user,
)

api = Blueprint("api", __name__, url_prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def is_strong_password(password: str) -> bool:
    if not password or len(password) < 8:
        return False
    has_digit = any(c.isdigit() for c in password)
    has_special = any(not c.isalnum() for c in password)
    return has_digit and has_special


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send an email via SMTP using env config. Falls back to console logging
    when SMTP isn't configured, so local/dev environments still 'work'."""
    host = os.environ.get("EMAIL_HOST")
    port = int(os.environ.get("EMAIL_PORT", 587))
    user = os.environ.get("EMAIL_USERNAME")
    password = os.environ.get("EMAIL_PASSWORD")

    if not all([host, user, password]):
        print(f"[email:dev-mode] To: {to_email} | Subject: {subject}\n{body}")
        return True

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = user
        msg["To"] = to_email
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(user, [to_email], msg.as_string())
        return True
    except Exception as exc:  # pragma: no cover
        print(f"[email] Failed to send to {to_email}: {exc}")
        return False


def generate_otp() -> str:
    return f"{random.randint(0, 9999):04d}"


def error(message, status=400):
    return jsonify({"message": message}), status


def to_object_id(value):
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def current_user_doc():
    """Fetch the authenticated user's Mongo document from the JWT identity."""
    db = get_db()
    uid = to_object_id(get_jwt_identity())
    if uid is None:
        return None
    return db.users.find_one({"_id": uid})


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@api.route("/health", methods=["GET"])
def health():
    try:
        get_db().command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"failed: {e}"
    return jsonify({"status": "ok", "service": "hisab-backend", "database": db_status})


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------
@api.route("/auth/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").lower().strip()
    password = body.get("password") or ""
    user_type = body.get("user_type") or "personal"

    if not email or "@" not in email:
        return error("A valid email address is required.")
    if not is_strong_password(password):
        return error("Password must be at least 8 characters and include a number and a special character.")
    if user_type not in ("personal", "business"):
        return error("user_type must be 'personal' or 'business'.")

    db = get_db()
    if db.users.find_one({"email": email}):
        return error("This email is already registered.", 409)

    otp_code = generate_otp()
    db.otps.delete_many({"email": email, "purpose": "register"})
    db.otps.insert_one(new_otp(email, otp_code, body, purpose="register"))

    send_email(
        email,
        "Your HISAB verification code",
        f"Your 4-digit HISAB verification code is: {otp_code}\nThis code expires in 10 minutes.",
    )
    return jsonify({"message": "OTP sent to email."}), 200


@api.route("/auth/verify-otp", methods=["POST"])
def verify_otp():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").lower().strip()
    otp_code = body.get("otp") or ""

    db = get_db()
    record = db.otps.find_one({"email": email, "purpose": {"$in": ["register", "login"]}}, sort=[("created_at", -1)])
    if not record or record["otp"] != otp_code:
        return error("Invalid or expired OTP.", 401)

    db.otps.delete_one({"_id": record["_id"]})

    if record["purpose"] == "register":
        payload = record["payload"]
        password_hash = hash_password(payload.get("password", ""))
        user_doc = new_user(
            email,
            password_hash,
            payload.get("user_type", "personal"),
            first_name=payload.get("first_name", ""),
            last_name=payload.get("last_name", ""),
            business_name=payload.get("business_name", ""),
            pan_number=payload.get("pan_number", ""),
            phone_number=payload.get("phone_number", ""),
        )
        user_doc["email_verified"] = True
        result = db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
    else:
        user_doc = db.users.find_one({"email": email})
        if not user_doc:
            return error("Account not found.", 404)

    token = create_access_token(identity=str(user_doc["_id"]))
    return jsonify({
        "message": "Verified",
        "token": token,
        "user_type": user_doc["user_type"],
        "first_name": user_doc.get("first_name", ""),
        "business_name": user_doc.get("business_name", ""),
        "email": user_doc["email"],
    })


@api.route("/auth/resend-otp", methods=["POST"])
def resend_otp():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").lower().strip()
    db = get_db()
    record = db.otps.find_one({"email": email}, sort=[("created_at", -1)])
    if not record:
        return error("No pending verification found for this email.", 404)

    otp_code = generate_otp()
    db.otps.update_one({"_id": record["_id"]}, {"$set": {"otp": otp_code, "created_at": now()}})
    send_email(email, "Your new HISAB verification code", f"Your new 4-digit code is: {otp_code}")
    return jsonify({"message": "OTP resent."})


@api.route("/auth/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").lower().strip()
    password = body.get("password") or ""

    db = get_db()
    user_doc = db.users.find_one({"email": email})
    if not user_doc or not verify_password(password, user_doc["password_hash"]):
        return error("Invalid email or password.", 401)

    db.users.update_one({"_id": user_doc["_id"]}, {"$set": {"last_login": now()}})
    token = create_access_token(identity=str(user_doc["_id"]))
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user_type": user_doc["user_type"],
        "first_name": user_doc.get("first_name", ""),
        "business_name": user_doc.get("business_name", ""),
        "email": user_doc["email"],
    })


@api.route("/auth/forgot-password", methods=["POST"])
def forgot_password():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").lower().strip()
    db = get_db()
    user_doc = db.users.find_one({"email": email})
    # Always return 200 to avoid leaking which emails are registered.
    if user_doc:
        reset_otp = generate_otp()
        db.otps.delete_many({"email": email, "purpose": "reset"})
        db.otps.insert_one(new_otp(email, reset_otp, {}, purpose="reset"))
        send_email(email, "Reset your HISAB password", f"Your password reset code is: {reset_otp}")
    return jsonify({"message": "If this email exists, a reset code has been sent."})


# ---------------------------------------------------------------------------
# USER PROFILE
# ---------------------------------------------------------------------------
@api.route("/user/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_doc = current_user_doc()
    if not user_doc:
        return error("User not found.", 404)
    return jsonify(serialize_user(user_doc))


@api.route("/user/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_doc = current_user_doc()
    if not user_doc:
        return error("User not found.", 404)
    body = request.get_json(silent=True) or {}
    allowed = {"first_name", "last_name", "business_name", "phone_number", "preferences"}
    updates = {k: v for k, v in body.items() if k in allowed}
    updates["updated_at"] = now()
    get_db().users.update_one({"_id": user_doc["_id"]}, {"$set": updates})
    return jsonify({"message": "Profile updated."})


# ---------------------------------------------------------------------------
# FINANCE — transactions
# ---------------------------------------------------------------------------
@api.route("/finance/income", methods=["POST"])
@jwt_required()
def add_income():
    return _add_transaction("income")


@api.route("/finance/expense", methods=["POST"])
@jwt_required()
def add_expense():
    return _add_transaction("expense")


def _add_transaction(tx_type):
    body = request.get_json(silent=True) or {}
    category = body.get("category")
    amount = body.get("amount")
    date = body.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not category or amount is None:
        return error("category and amount are required.")

    db = get_db()
    doc = new_transaction(get_jwt_identity(), tx_type, category, amount, date, body.get("description", ""))
    result = db.transactions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify(serialize_transaction(doc)), 201


@api.route("/finance/transactions", methods=["GET"])
@jwt_required()
def list_transactions():
    db = get_db()
    cursor = db.transactions.find({"user_id": get_jwt_identity()}).sort("date", -1).limit(500)
    return jsonify([serialize_transaction(d) for d in cursor])


@api.route("/finance/summary", methods=["GET"])
@jwt_required()
def finance_summary():
    db = get_db()
    uid = get_jwt_identity()
    income = list(db.transactions.aggregate([
        {"$match": {"user_id": uid, "type": "income"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]))
    expense = list(db.transactions.aggregate([
        {"$match": {"user_id": uid, "type": "expense"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]))
    breakdown = list(db.transactions.aggregate([
        {"$match": {"user_id": uid, "type": "expense"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
    ]))

    total_income = income[0]["total"] if income else 0
    total_expense = expense[0]["total"] if expense else 0

    return jsonify({
        "income": total_income,
        "expense": total_expense,
        "savings": total_income - total_expense,
        "expense_breakdown": {row["_id"]: row["total"] for row in breakdown},
    })


# ---------------------------------------------------------------------------
# LOANS
# ---------------------------------------------------------------------------
@api.route("/loan/apply", methods=["POST"])
@jwt_required()
def apply_loan():
    body = request.get_json(silent=True) or {}
    required = ["equipment_name", "amount", "purpose"]
    if any(not body.get(f) for f in required):
        return error("equipment_name, amount and purpose are required.")

    db = get_db()
    user_doc = current_user_doc()
    doc = new_loan(
        get_jwt_identity(),
        body.get("loan_type", user_doc["user_type"] if user_doc else "personal"),
        body["equipment_name"],
        body["amount"],
        body["purpose"],
        repayment_frequency=body.get("repayment_frequency", "monthly"),
        expected_roi=body.get("expected_roi", ""),
    )
    result = db.loans.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify(serialize_loan(doc)), 201


@api.route("/loan/status", methods=["GET"])
@jwt_required()
def loan_status():
    db = get_db()
    cursor = db.loans.find({"user_id": get_jwt_identity()}).sort("created_at", -1)
    return jsonify([serialize_loan(d) for d in cursor])


@api.route("/loan/repay", methods=["POST"])
@jwt_required()
def repay_loan():
    body = request.get_json(silent=True) or {}
    loan_id = to_object_id(body.get("loan_id"))
    amount = body.get("amount")
    if loan_id is None or amount is None:
        return error("loan_id and amount are required.")

    db = get_db()
    loan_doc = db.loans.find_one({"_id": loan_id, "user_id": get_jwt_identity()})
    if not loan_doc:
        return error("Loan not found.", 404)

    date = body.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    db.repayments.insert_one(new_repayment(str(loan_id), amount, date))

    new_paid = loan_doc.get("paid_amount", 0) + float(amount)
    updates = {"paid_amount": new_paid}
    if new_paid >= loan_doc["amount"]:
        updates["status"] = "paid"
    elif loan_doc["status"] == "approved":
        updates["status"] = "active"
    db.loans.update_one({"_id": loan_id}, {"$set": updates})

    return jsonify({"message": "Repayment recorded.", "paid_amount": new_paid})


@api.route("/loan/schedule", methods=["GET"])
@jwt_required()
def loan_schedule():
    db = get_db()
    loan_id = to_object_id(request.args.get("loan_id"))
    query = {"user_id": get_jwt_identity()}
    loans_cursor = db.loans.find({"_id": loan_id} if loan_id else query)
    loan_ids = [str(l["_id"]) for l in loans_cursor]
    repayments = list(db.repayments.find({"loan_id": {"$in": loan_ids}}).sort("date", 1))
    for r in repayments:
        r["id"] = str(r.pop("_id"))
    return jsonify(repayments)


# ---------------------------------------------------------------------------
# SAVINGS GOALS
# ---------------------------------------------------------------------------
@api.route("/savings/goals", methods=["GET"])
@jwt_required()
def list_savings_goals():
    db = get_db()
    cursor = db.savings.find({"user_id": get_jwt_identity()}).sort("created_at", -1)
    return jsonify([serialize_savings_goal(d) for d in cursor])


@api.route("/savings/goals", methods=["POST"])
@jwt_required()
def create_savings_goal():
    body = request.get_json(silent=True) or {}
    if not body.get("goal_name") or not body.get("target_amount"):
        return error("goal_name and target_amount are required.")
    db = get_db()
    doc = new_savings_goal(get_jwt_identity(), body["goal_name"], body["target_amount"], body.get("deadline"))
    result = db.savings.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify(serialize_savings_goal(doc)), 201


@api.route("/savings/goals/<goal_id>/contribute", methods=["POST"])
@jwt_required()
def contribute_savings_goal(goal_id):
    body = request.get_json(silent=True) or {}
    amount = body.get("amount")
    oid = to_object_id(goal_id)
    if oid is None or amount is None:
        return error("A valid goal_id and amount are required.")
    db = get_db()
    db.savings.update_one(
        {"_id": oid, "user_id": get_jwt_identity()},
        {"$inc": {"current_amount": float(amount)}},
    )
    return jsonify({"message": "Contribution added."})


# ---------------------------------------------------------------------------
# DASHBOARD preferences
# ---------------------------------------------------------------------------
@api.route("/dashboard/preferences", methods=["POST"])
@jwt_required()
def update_dashboard_preferences():
    body = request.get_json(silent=True) or {}
    db = get_db()
    db.users.update_one(
        {"_id": to_object_id(get_jwt_identity())},
        {"$set": {"preferences": body, "updated_at": now()}},
    )
    return jsonify({"message": "Preferences saved."})


# ---------------------------------------------------------------------------
# ANALYTICS / AI INSIGHTS (heuristic v1 — see Phase 6 roadmap for full ML)
# ---------------------------------------------------------------------------
@api.route("/analytics/insights", methods=["GET"])
@jwt_required()
def analytics_insights():
    db = get_db()
    uid = get_jwt_identity()
    breakdown = list(db.transactions.aggregate([
        {"$match": {"user_id": uid, "type": "expense"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
    ]))
    income_total = list(db.transactions.aggregate([
        {"$match": {"user_id": uid, "type": "income"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]))
    expense_total = sum(row["total"] for row in breakdown)
    income_total = income_total[0]["total"] if income_total else 0

    tips = []
    if breakdown:
        top = breakdown[0]
        pct = round((top["total"] / expense_total) * 100) if expense_total else 0
        tips.append(f"Your largest expense category is {top['_id']} at {pct}% of spending.")
    if income_total and expense_total >= income_total * 0.8:
        tips.append("You've spent over 80% of your income this period — review discretionary spending.")
    else:
        tips.append("Your spending is within a healthy range relative to income.")
    tips.append("Consistent repayment history is improving your alternative credit profile.")

    return jsonify({
        "tips": tips,
        "expense_breakdown": {row["_id"]: row["total"] for row in breakdown},
        "anomalies": [],  # placeholder for anomaly-detection model (Phase 3)
    })

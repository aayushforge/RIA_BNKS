"""
HISAB — database.py
MongoDB connection layer (pymongo). Reads config from environment variables
(see ../.env.example). Exposes a single `get_db()` accessor plus lazily
created collection handles, and ensures the indexes the app relies on.
"""

import os
from pymongo import MongoClient, ASCENDING
from pymongo.server_api import ServerApi

_client = None
_db = None


def get_client():
    global _client
    if _client is None:
        uri = os.environ.get("DATABASE_URL", "mongodb://localhost:27017")
        try:
            _client = MongoClient(uri, server_api=ServerApi("1"), serverSelectionTimeoutMS=5000)
        except Exception:
            _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    return _client


def get_db():
    global _db
    if _db is None:
        db_name = os.environ.get("DATABASE_NAME", "hisab")
        _db = get_client()[db_name]
        _ensure_indexes(_db)
    return _db


def _ensure_indexes(db):
    """Create indexes required for data integrity & fast lookups. Safe to call repeatedly."""
    try:
        db.users.create_index([("email", ASCENDING)], unique=True)
        db.transactions.create_index([("user_id", ASCENDING), ("date", ASCENDING)])
        db.loans.create_index([("user_id", ASCENDING)])
        db.repayments.create_index([("loan_id", ASCENDING)])
        db.savings.create_index([("user_id", ASCENDING)])
        # OTPs auto-expire 10 minutes after creation.
        db.otps.create_index("created_at", expireAfterSeconds=600)
    except Exception as exc:  # pragma: no cover - best effort, DB may be offline in dev
        print(f"[database] Warning: could not ensure indexes ({exc}). "
              f"Is MongoDB running / DATABASE_URL correct?")


def ping():
    """Health-check helper used by /api/health."""
    try:
        get_client().admin.command("ping")
        return True
    except Exception:
        return False

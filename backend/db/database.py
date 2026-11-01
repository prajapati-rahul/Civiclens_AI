"""
Database setup and connection management for CivicLens AI.
Supports both SQLite and MongoDB seamlessly via DATABASE_URL:
- MongoDB: mongodb://localhost:27017/civiclens or mongodb+srv://... (via motor)
- SQLite:  sqlite:///./civiclens.db (default, zero-setup embedded)
"""

from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./civiclens.db")
IS_MONGODB = DATABASE_URL.startswith("mongodb://") or DATABASE_URL.startswith("mongodb+srv://")

# ---------------------------------------------------------------------------
# MongoDB Implementation (via Motor)
# ---------------------------------------------------------------------------
_mongo_client = None
_mongo_db = None


def _get_mongo_db():
    global _mongo_client, _mongo_db
    if _mongo_db is None:
        import motor.motor_asyncio  # noqa: PLC0415

        _mongo_client = motor.motor_asyncio.AsyncIOMotorClient(DATABASE_URL)
        # Extract DB name from URL or default to "civiclens"
        parsed = urlparse(DATABASE_URL)
        db_name = parsed.path.lstrip("/").split("?")[0] or "civiclens"
        _mongo_db = _mongo_client[db_name]
    return _mongo_db


# ---------------------------------------------------------------------------
# SQLite Implementation
# ---------------------------------------------------------------------------
DB_PATH = DATABASE_URL
if DB_PATH.startswith("sqlite:///"):
    DB_PATH = DB_PATH[len("sqlite:///"):]

_backend_dir = Path(__file__).parent.parent
DB_FILE = str(_backend_dir / DB_PATH) if not os.path.isabs(DB_PATH) else DB_PATH


def _get_sqlite_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=DELETE")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


# ---------------------------------------------------------------------------
# Unified Database Interface
# ---------------------------------------------------------------------------

async def init_db() -> None:
    """Create schema/tables or collection indexes on application startup."""
    if IS_MONGODB:
        db = _get_mongo_db()
        # Create unique index on 'id' and index on 'created_at'
        await db.audits.create_index("id", unique=True)
        await db.audits.create_index([("created_at", -1)])
        print(f"[DB] MongoDB initialised for collection 'audits'", file=sys.stderr)
    else:
        conn = _get_sqlite_connection()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audits (
                    id            TEXT PRIMARY KEY,
                    url           TEXT NOT NULL,
                    task          TEXT NOT NULL,
                    scope         TEXT NOT NULL,
                    description   TEXT,
                    status        TEXT NOT NULL DEFAULT 'pending',
                    created_at    TEXT NOT NULL,
                    completed_at  TEXT,
                    error_message TEXT,
                    result_json   TEXT
                )
            """)
            conn.commit()
        finally:
            conn.close()
        print(f"[DB] SQLite initialised at {DB_FILE}", file=sys.stderr)


async def save_audit_result(
    audit_id: str,
    status: str,
    completed_at: str,
    result_json: str,
    error_message: Optional[str] = None,
) -> None:
    """Persist final audit results."""
    if IS_MONGODB:
        db = _get_mongo_db()
        await db.audits.update_one(
            {"id": audit_id},
            {
                "$set": {
                    "status": status,
                    "completed_at": completed_at,
                    "result_json": result_json,
                    "error_message": error_message,
                }
            },
        )
    else:
        conn = _get_sqlite_connection()
        try:
            conn.execute(
                """
                UPDATE audits
                SET status        = ?,
                    completed_at  = ?,
                    result_json   = ?,
                    error_message = ?
                WHERE id = ?
                """,
                (status, completed_at, result_json, error_message, audit_id),
            )
            conn.commit()
        finally:
            conn.close()


async def update_audit_status(audit_id: str, status: str) -> None:
    """Update status while audit is executing."""
    if IS_MONGODB:
        db = _get_mongo_db()
        await db.audits.update_one(
            {"id": audit_id},
            {"$set": {"status": status}},
        )
    else:
        conn = _get_sqlite_connection()
        try:
            conn.execute(
                "UPDATE audits SET status = ? WHERE id = ?",
                (status, audit_id),
            )
            conn.commit()
        finally:
            conn.close()


async def create_audit_record(
    audit_id: str,
    url: str,
    task: str,
    scope: str,
    description: Optional[str],
    created_at: str,
) -> None:
    """Insert a new audit record."""
    if IS_MONGODB:
        db = _get_mongo_db()
        doc = {
            "id": audit_id,
            "url": url,
            "task": task,
            "scope": scope,
            "description": description,
            "status": "pending",
            "created_at": created_at,
            "completed_at": None,
            "error_message": None,
            "result_json": None,
        }
        await db.audits.insert_one(doc)
    else:
        conn = _get_sqlite_connection()
        try:
            conn.execute(
                """
                INSERT INTO audits (id, url, task, scope, description, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
                """,
                (audit_id, url, task, scope, description, created_at),
            )
            conn.commit()
        finally:
            conn.close()


async def get_audit_by_id(audit_id: str) -> Optional[Dict[str, Any]]:
    """Fetch single audit record."""
    if IS_MONGODB:
        db = _get_mongo_db()
        doc = await db.audits.find_one({"id": audit_id}, {"_id": 0})
        return dict(doc) if doc else None
    else:
        conn = _get_sqlite_connection()
        try:
            cursor = conn.execute("SELECT * FROM audits WHERE id = ?", (audit_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


async def list_audits(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Return paginated list of audits."""
    if IS_MONGODB:
        db = _get_mongo_db()
        cursor = (
            db.audits.find({}, {"_id": 0})
            .sort("created_at", -1)
            .skip(offset)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)
    else:
        conn = _get_sqlite_connection()
        try:
            cursor = conn.execute(
                "SELECT * FROM audits ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            )
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


async def delete_audit(audit_id: str) -> bool:
    """Delete an audit record."""
    if IS_MONGODB:
        db = _get_mongo_db()
        result = await db.audits.delete_one({"id": audit_id})
        return result.deleted_count > 0
    else:
        conn = _get_sqlite_connection()
        try:
            cursor = conn.execute("DELETE FROM audits WHERE id = ?", (audit_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


async def clear_all_audits() -> int:
    """Clear all audit records."""
    if IS_MONGODB:
        db = _get_mongo_db()
        result = await db.audits.delete_many({})
        return result.deleted_count
    else:
        conn = _get_sqlite_connection()
        try:
            cursor = conn.execute("DELETE FROM audits")
            conn.commit()
            return cursor.rowcount
        finally:
            conn.close()

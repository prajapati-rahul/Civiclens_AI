"""
Database setup and connection management for CivicLens AI.
Uses Python's standard library sqlite3 with robust, cross-platform compatibility.
Avoids multi-file WAL locking issues on cloud-synced folders (OneDrive/Dropbox).
"""

from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./civiclens.db")
if DB_PATH.startswith("sqlite:///"):
    DB_PATH = DB_PATH[len("sqlite:///"):]

_backend_dir = Path(__file__).parent.parent
DB_FILE = str(_backend_dir / DB_PATH) if not os.path.isabs(DB_PATH) else DB_PATH


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=DELETE")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


async def init_db() -> None:
    """Create tables if they do not exist."""
    conn = _get_connection()
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
    print(f"[DB] Database initialised at {DB_FILE}", file=sys.stderr)


async def save_audit_result(
    audit_id: str,
    status: str,
    completed_at: str,
    result_json: str,
    error_message: Optional[str] = None,
) -> None:
    """Persist final audit results."""
    conn = _get_connection()
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
    conn = _get_connection()
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
    conn = _get_connection()
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
    conn = _get_connection()
    try:
        cursor = conn.execute("SELECT * FROM audits WHERE id = ?", (audit_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


async def list_audits(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Return paginated list of audits."""
    conn = _get_connection()
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
    conn = _get_connection()
    try:
        cursor = conn.execute("DELETE FROM audits WHERE id = ?", (audit_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


async def clear_all_audits() -> int:
    """Clear all audit records."""
    conn = _get_connection()
    try:
        cursor = conn.execute("DELETE FROM audits")
        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()

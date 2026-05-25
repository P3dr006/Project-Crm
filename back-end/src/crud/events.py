import logging
from fastapi import HTTPException, status
from src.database import get_db_connection, release_db_connection

logger = logging.getLogger(__name__)

# Allowlist of columns that can be updated via the public API.
_UPDATABLE_FIELDS = {"title", "scheduled_at", "status", "notes", "assigned_to"}

_EVENT_COLUMNS = """
    id, workspace_id, created_by, assigned_to, lead_id,
    type, title, notes, scheduled_at, status, created_at, updated_at
"""


def _serialize(event: dict) -> dict:
    """Convert UUIDs and datetimes to JSON-safe strings."""
    for key in ("id", "workspace_id", "created_by", "assigned_to", "lead_id"):
        if event.get(key):
            event[key] = str(event[key])
    for key in ("scheduled_at", "created_at", "updated_at"):
        if event.get(key):
            event[key] = event[key].isoformat()
    return event


def create_event(workspace_id: str, created_by: str, user_role: str, data: dict):
    """Creates a new event scoped to the workspace, with RBAC on the assignee."""
    assigned_to = str(data.get("assigned_to") or created_by)

    if user_role == "Employee" and assigned_to != created_by:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees can only schedule events for themselves.",
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            f"""
            INSERT INTO events
                (workspace_id, created_by, assigned_to, lead_id, type, title, notes, scheduled_at, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending')
            RETURNING {_EVENT_COLUMNS};
            """,
            (
                workspace_id,
                created_by,
                assigned_to,
                data.get("lead_id"),
                data.get("type", "meeting"),
                data.get("title"),
                data.get("notes"),
                data.get("scheduled_at"),
            ),
        )
        row = cursor.fetchone()
        columns = [desc[0] for desc in cursor.description]
        conn.commit()
        return _serialize(dict(zip(columns, row)))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating event: %s", e)
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to create event.")
    finally:
        cursor.close()
        release_db_connection(conn)


def get_events_by_workspace(workspace_id: str, user_id: str, role: str):
    """Fetches events for a workspace. Employees only see their own events."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = f"SELECT {_EVENT_COLUMNS} FROM events WHERE workspace_id = %s"
        params = [workspace_id]

        if role == "Employee":
            query += " AND assigned_to = %s"
            params.append(user_id)

        query += " ORDER BY scheduled_at ASC"
        cursor.execute(query, tuple(params))

        columns = [desc[0] for desc in cursor.description]
        return [_serialize(dict(zip(columns, row))) for row in cursor.fetchall()]
    finally:
        cursor.close()
        release_db_connection(conn)


def update_event(event_id: str, workspace_id: str, user_id: str, role: str, data: dict):
    """Updates allowed event fields. Employees can only edit events they own or are assigned to."""
    safe_data = {k: v for k, v in data.items() if k in _UPDATABLE_FIELDS}
    if not safe_data:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT assigned_to, created_by FROM events WHERE id = %s AND workspace_id = %s;",
            (event_id, workspace_id),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Event not found.")

        assigned_to, created_by = str(row[0]), str(row[1])
        if role == "Employee" and user_id not in (assigned_to, created_by):
            raise HTTPException(status_code=403, detail="You do not have permission to edit this event.")

        fields = ", ".join(f"{k} = %s" for k in safe_data)
        values = list(safe_data.values())
        values.extend([event_id, workspace_id])

        cursor.execute(
            f"""
            UPDATE events
            SET {fields}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND workspace_id = %s
            RETURNING {_EVENT_COLUMNS};
            """,
            tuple(values),
        )
        updated_row = cursor.fetchone()
        columns = [desc[0] for desc in cursor.description]
        conn.commit()
        return _serialize(dict(zip(columns, updated_row)))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating event %s: %s", event_id, e)
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update event.")
    finally:
        cursor.close()
        release_db_connection(conn)


def delete_event(event_id: str, workspace_id: str, user_id: str, role: str):
    """Deletes an event. Employees can only delete events they created."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT created_by FROM events WHERE id = %s AND workspace_id = %s;",
            (event_id, workspace_id),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Event not found.")

        if role == "Employee" and str(row[0]) != user_id:
            raise HTTPException(status_code=403, detail="Only the creator or a manager can delete this event.")

        cursor.execute(
            "DELETE FROM events WHERE id = %s AND workspace_id = %s;",
            (event_id, workspace_id),
        )
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting event %s: %s", event_id, e)
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete event.")
    finally:
        cursor.close()
        release_db_connection(conn)

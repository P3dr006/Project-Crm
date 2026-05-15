import logging
from src.database import get_db_connection, release_db_connection

logger = logging.getLogger(__name__)

# Allowlist of columns that can be updated via the public API.
_UPDATABLE_FIELDS = {"full_name", "phone", "email", "status", "source", "notes", "next_contact_date", "assigned_to"}


def create_lead(workspace_id: str, user_id: str, lead_data):
    """Creates a new lead scoped to the workspace, assigned to the requesting user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO leads (workspace_id, assigned_to, full_name, phone, email, status, source)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (workspace_id, user_id, lead_data.full_name, lead_data.phone,
             lead_data.email, lead_data.status.value, lead_data.source.value)
        )
        lead_id = cursor.fetchone()[0]
        conn.commit()
        return str(lead_id)
    except Exception as e:
        logger.error("Error creating lead: %s", e)
        conn.rollback()
        return None
    finally:
        cursor.close()
        release_db_connection(conn)


def get_lead_by_id(lead_id: str, workspace_id: str):
    """Fetches a single lead, ensuring it belongs to the requesting workspace."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM leads WHERE id = %s AND workspace_id = %s;",
            (lead_id, workspace_id)
        )
        row = cursor.fetchone()
        if not row:
            return None
        columns = [desc[0] for desc in cursor.description]
        lead = dict(zip(columns, row))
        lead["id"] = str(lead["id"])
        lead["workspace_id"] = str(lead["workspace_id"])
        if lead.get("assigned_to"):
            lead["assigned_to"] = str(lead["assigned_to"])
        if lead.get("created_at"):
            lead["created_at"] = lead["created_at"].isoformat()
        if lead.get("updated_at"):
            lead["updated_at"] = lead["updated_at"].isoformat()
        return lead
    finally:
        cursor.close()
        release_db_connection(conn)


def get_leads_by_workspace(workspace_id: str, limit: int = 50, offset: int = 0):
    """Fetches all leads for a workspace with pagination."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, assigned_to, full_name, phone, email, status, source, created_at, updated_at
            FROM leads
            WHERE workspace_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s;
            """,
            (workspace_id, limit, offset)
        )
        columns = [desc[0] for desc in cursor.description]
        leads = [dict(zip(columns, row)) for row in cursor.fetchall()]
        for lead in leads:
            lead["id"] = str(lead["id"])
            if lead.get("assigned_to"):
                lead["assigned_to"] = str(lead["assigned_to"])
            if lead.get("created_at"):
                lead["created_at"] = lead["created_at"].isoformat()
            if lead.get("updated_at"):
                lead["updated_at"] = lead["updated_at"].isoformat()
        return leads
    finally:
        cursor.close()
        release_db_connection(conn)


def update_lead(lead_id: str, workspace_id: str, update_data: dict):
    """Updates allowed lead fields, scoped to the workspace."""
    safe_data = {k: v for k, v in update_data.items() if k in _UPDATABLE_FIELDS}
    if not safe_data:
        return False

    conn = get_db_connection()
    cursor = conn.cursor()
    fields = ", ".join([f"{k} = %s" for k in safe_data.keys()])
    values = list(safe_data.values())
    values.extend([lead_id, workspace_id])
    try:
        cursor.execute(
            f"UPDATE leads SET {fields}, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND workspace_id = %s;",
            tuple(values)
        )
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        logger.error("Error updating lead %s: %s", lead_id, e)
        conn.rollback()
        return False
    finally:
        cursor.close()
        release_db_connection(conn)


def delete_lead(lead_id: str, workspace_id: str):
    """Permanently deletes a lead, scoped to the workspace."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM leads WHERE id = %s AND workspace_id = %s;",
            (lead_id, workspace_id)
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        release_db_connection(conn)

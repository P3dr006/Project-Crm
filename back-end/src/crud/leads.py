import logging
from typing import Optional
from fastapi import HTTPException
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
            INSERT INTO leads (workspace_id, assigned_to, full_name, phone, email, status, source, notes, next_contact_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (workspace_id, user_id, lead_data.full_name, lead_data.phone,
             lead_data.email, lead_data.status.value, lead_data.source.value,
             lead_data.notes, lead_data.next_contact_date)
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


def get_lead_by_id(lead_id: str, workspace_id: str, user_id: str = None, role: str = None):
    """Fetches a single lead. Employees can only fetch leads assigned to them."""
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

        if role == "Employee" and str(lead.get("assigned_to")) != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this lead.")

        lead["id"] = str(lead["id"])
        lead["workspace_id"] = str(lead["workspace_id"])
        if lead.get("assigned_to"):
            lead["assigned_to"] = str(lead["assigned_to"])
        if lead.get("created_at"):
            lead["created_at"] = lead["created_at"].isoformat()
        if lead.get("updated_at"):
            lead["updated_at"] = lead["updated_at"].isoformat()
        if lead.get("next_contact_date"):
            lead["next_contact_date"] = lead["next_contact_date"].isoformat()
        return lead
    finally:
        cursor.close()
        release_db_connection(conn)


def get_leads_by_workspace(
    workspace_id: str,
    user_id: str,
    role: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    callback_start: Optional[str] = None,
    callback_end: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Fetches all leads for a workspace with pagination, date filters, and role-based access."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Base query — always scoped to the workspace for tenant isolation
        query = """
            SELECT id, assigned_to, full_name, phone, email, status, source,
                   notes, next_contact_date, created_at, updated_at
            FROM leads
            WHERE workspace_id = %s
        """
        params = [workspace_id]

        # Role-based access: Employees only see leads assigned to them
        if role == "Employee":
            query += " AND assigned_to = %s"
            params.append(user_id)

        # Optional date range filters
        if start_date:
            query += " AND created_at >= %s"
            params.append(start_date)

        if end_date:
            # Append 23:59:59 so the end date is inclusive for the full day
            query += " AND created_at <= %s"
            params.append(f"{end_date} 23:59:59")

        # Optional callback date range filter (used by Agenda and CallbackNotifier)
        if callback_start:
            query += " AND next_contact_date >= %s"
            params.append(callback_start)
        if callback_end:
            query += " AND next_contact_date <= %s"
            params.append(f"{callback_end} 23:59:59")

        # Sorting and pagination always applied last
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, tuple(params))

        # Serialize UUIDs and datetimes to JSON-safe strings
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
            if lead.get("next_contact_date"):
                lead["next_contact_date"] = lead["next_contact_date"].isoformat()

        return leads
    finally:
        cursor.close()
        release_db_connection(conn)

def auto_close_stale_callbacks(workspace_id: str) -> int:
    """Marks as 'No Response' any lead whose callback has been overdue for 60+ days."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE leads
            SET status = 'No Response',
                next_contact_date = NULL,
                notes = CASE
                    WHEN notes IS NULL OR notes = ''
                        THEN '[Auto] Closed after 60 days with no callback action.'
                    ELSE notes || E'\n[Auto] Closed after 60 days with no callback action.'
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = %s
              AND next_contact_date < NOW() - INTERVAL '60 days'
              AND status NOT IN ('Lost', 'Converted', 'No Response')
            """,
            (workspace_id,)
        )
        closed = cursor.rowcount
        conn.commit()
        return closed
    except Exception as e:
        logger.error("Error auto-closing stale callbacks: %s", e)
        conn.rollback()
        return 0
    finally:
        cursor.close()
        release_db_connection(conn)


def update_lead(lead_id: str, workspace_id: str, update_data: dict, user_id: str = None, role: str = None):
    """Updates allowed lead fields. Employees can only update leads assigned to them."""
    safe_data = {k: v for k, v in update_data.items() if k in _UPDATABLE_FIELDS}
    if not safe_data:
        return False

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if role == "Employee":
            cursor.execute(
                "SELECT assigned_to FROM leads WHERE id = %s AND workspace_id = %s;",
                (lead_id, workspace_id)
            )
            row = cursor.fetchone()
            if not row or str(row[0]) != user_id:
                raise HTTPException(status_code=403, detail="Access denied to this lead.")

        fields = ", ".join([f"{k} = %s" for k in safe_data.keys()])
        values = list(safe_data.values())
        values.extend([lead_id, workspace_id])
        cursor.execute(
            f"UPDATE leads SET {fields}, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND workspace_id = %s;",
            tuple(values)
        )
        conn.commit()
        return cursor.rowcount > 0
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating lead %s: %s", lead_id, e)
        conn.rollback()
        return False
    finally:
        cursor.close()
        release_db_connection(conn)


def delete_lead(lead_id: str, workspace_id: str, role: str = None):
    """Permanently deletes a lead. Only Owners and Managers can delete leads."""
    if role == "Employee":
        raise HTTPException(status_code=403, detail="Employees are not allowed to delete leads.")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM leads WHERE id = %s AND workspace_id = %s;",
            (lead_id, workspace_id)
        )
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        logger.error("Error deleting lead %s: %s", lead_id, e)
        conn.rollback()
        return False
    finally:
        cursor.close()
        release_db_connection(conn)

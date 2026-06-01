import re
import logging
from src.database import get_db_connection, release_db_connection

logger = logging.getLogger(__name__)


def normalize_phone(phone: str) -> str:
    """Strips all non-digit characters for duplicate comparison.
    '(45) 99999-0000', '45 99999-0000' and '4599990000' all become '4599990000'.
    """
    return re.sub(r"\D", "", phone) if phone else phone


def upsert_contact(
    workspace_id: str,
    full_name: str,
    phone: str,
    email: str = None,
    source: str = "Other",
    notes: str = None,
) -> str | None:
    """
    Creates a new contact or updates an existing one.
    Deduplication order: phone match first, then email match.
    Returns the contact_id (str) or None on failure.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        existing_id = None
        phone_digits = normalize_phone(phone)

        # 1. Check for existing contact by phone (normalized — ignores formatting)
        cursor.execute(
            "SELECT id FROM contacts WHERE workspace_id = %s AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = %s;",
            (workspace_id, phone_digits),
        )
        row = cursor.fetchone()
        if row:
            existing_id = str(row[0])

        # 2. Check for existing contact by email (if no phone match)
        if not existing_id and email:
            cursor.execute(
                "SELECT id FROM contacts WHERE workspace_id = %s AND email = %s;",
                (workspace_id, email),
            )
            row = cursor.fetchone()
            if row:
                existing_id = str(row[0])

        if existing_id:
            # Contact already exists — only fill in fields that are currently NULL.
            # Never overwrite name, phone or source: the contact record is the source
            # of truth and the lead form may contain typos or partial data.
            cursor.execute(
                """
                UPDATE contacts SET
                    email      = COALESCE(email, %s),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (email, existing_id),
            )
            conn.commit()
            return existing_id

        # 3. No match — insert new contact
        cursor.execute(
            """
            INSERT INTO contacts (workspace_id, full_name, phone, email, source, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (workspace_id, full_name, phone, email, source, notes),
        )
        contact_id = str(cursor.fetchone()[0])
        conn.commit()
        return contact_id

    except Exception as e:
        logger.error("Error upserting contact: %s", e)
        conn.rollback()
        return None
    finally:
        cursor.close()
        release_db_connection(conn)


def check_contact_duplicate(
    workspace_id: str,
    phone: str = None,
    email: str = None,
) -> dict | None:
    """Returns the first contact that matches the given phone (normalized) or email. None if no match."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conditions = []
        params = [workspace_id]

        if phone:
            phone_digits = normalize_phone(phone)
            conditions.append("REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = %s")
            params.append(phone_digits)
        if email:
            conditions.append("email = %s")
            params.append(email)

        if not conditions:
            return None

        where = " OR ".join(conditions)
        cursor.execute(
            f"SELECT id, full_name, phone, email FROM contacts WHERE workspace_id = %s AND ({where}) LIMIT 1;",
            tuple(params),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {"id": str(row[0]), "full_name": row[1], "phone": row[2], "email": row[3]}
    finally:
        cursor.close()
        release_db_connection(conn)


def get_contacts_by_workspace(
    workspace_id: str,
    search: str = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    """Returns paginated contacts for a workspace, newest first.
    Optionally filters by name, phone or email via the search param."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        offset = (page - 1) * size
        like = f"%{search}%" if search else None
        search_clause = "AND (full_name ILIKE %s OR phone ILIKE %s OR email ILIKE %s)" if search else ""

        base_params = [workspace_id]
        if search:
            base_params += [like, like, like]

        cursor.execute(
            f"""
            SELECT id, workspace_id, full_name, phone, email, source, notes, created_at, updated_at,
                   COUNT(*) OVER() AS total_count
            FROM contacts
            WHERE workspace_id = %s {search_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s;
            """,
            tuple(base_params + [size, offset]),
        )
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        total = 0
        contacts = []
        for row in rows:
            c = dict(zip(columns, row))
            total = c.pop("total_count", 0)
            c["id"] = str(c["id"])
            c["workspace_id"] = str(c["workspace_id"])
            if c.get("created_at"):
                c["created_at"] = c["created_at"].isoformat()
            if c.get("updated_at"):
                c["updated_at"] = c["updated_at"].isoformat()
            contacts.append(c)

        import math
        return {
            "contacts": contacts,
            "total": total,
            "page": page,
            "pages": max(1, math.ceil(total / size)),
        }
    finally:
        cursor.close()
        release_db_connection(conn)

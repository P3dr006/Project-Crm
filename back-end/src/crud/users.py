import logging
from psycopg2 import errors
from src.database import get_db_connection, release_db_connection
from src.auth_utils import hash_password, verify_password

logger = logging.getLogger(__name__)

# Allowlist of columns that can be updated via the public API.
# Prevents SQL injection through column name manipulation.
_UPDATABLE_FIELDS = {"full_name", "email"}


def create_user(full_name, email, raw_password, company_name=None):
    """Creates a new Workspace and its Owner in a single atomic transaction."""
    conn = get_db_connection()
    cursor = conn.cursor()
    hashed_pwd = hash_password(raw_password)

    if not company_name:
        company_name = f"{full_name}'s Workspace"

    try:
        cursor.execute(
            "INSERT INTO workspaces (name, plan) VALUES (%s, 'Bronze') RETURNING id;",
            (company_name,)
        )
        workspace_id = cursor.fetchone()[0]

        cursor.execute(
            """
            INSERT INTO users (workspace_id, full_name, email, password_hash, role)
            VALUES (%s, %s, %s, %s, 'Owner')
            RETURNING id, workspace_id, full_name, email, role, created_at;
            """,
            (workspace_id, full_name, email, hashed_pwd)
        )
        row = cursor.fetchone()
        conn.commit()

        return {
            "id": str(row[0]),
            "workspace_id": str(row[1]),
            "full_name": row[2],
            "email": row[3],
            "plan": "Bronze",  # always Bronze on creation; plan lives on workspaces table
            "role": row[4],
            "created_at": row[5].isoformat() if row[5] else None,
        }

    except errors.UniqueViolation:
        conn.rollback()
        return {"error": "email_exists"}

    except Exception as e:
        logger.error("Error creating user and workspace: %s", e)
        conn.rollback()
        return {"error": "database_error"}

    finally:
        cursor.close()
        release_db_connection(conn)


def authenticate_user(email, password):
    """Verifies credentials and returns user data including the workspace plan."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # plan is stored on workspaces, so we JOIN to fetch it
        cursor.execute(
            """
            SELECT u.id, u.workspace_id, u.full_name, u.email,
                   u.password_hash, w.plan, u.role, u.created_at
            FROM users u
            JOIN workspaces w ON w.id = u.workspace_id
            WHERE u.email = %s;
            """,
            (email,)
        )
        row = cursor.fetchone()
        if not row:
            return None

        user_id, workspace_id, full_name, user_email, hashed_pwd, plan, role, created_at = row

        if not verify_password(password, hashed_pwd):
            return None

        return {
            "id": str(user_id),
            "workspace_id": str(workspace_id),
            "full_name": full_name,
            "email": user_email,
            "plan": plan,
            "role": role,
            "created_at": created_at.isoformat() if created_at else None,
        }

    finally:
        cursor.close()
        release_db_connection(conn)


def update_user(user_id: str, update_data: dict):
    """Updates allowed user profile fields."""
    safe_data = {k: v for k, v in update_data.items() if k in _UPDATABLE_FIELDS}
    if not safe_data:
        return None

    conn = get_db_connection()
    cursor = conn.cursor()
    fields = ", ".join([f"{k} = %s" for k in safe_data.keys()])
    values = list(safe_data.values())
    values.append(user_id)

    try:
        cursor.execute(
            f"UPDATE users SET {fields} WHERE id = %s RETURNING full_name;",
            tuple(values)
        )
        conn.commit()
        row = cursor.fetchone()
        return {"full_name": row[0]} if row else None

    except errors.UniqueViolation:
        conn.rollback()
        return {"error": "email_exists"}

    except Exception as e:
        logger.error("Error updating user %s: %s", user_id, e)
        conn.rollback()
        return {"error": "database_error"}

    finally:
        cursor.close()
        release_db_connection(conn)

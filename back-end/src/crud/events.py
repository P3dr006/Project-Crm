from src.database import get_db_connection, release_db_connection
from fastapi import HTTPException, status
from uuid import UUID

def create_event(workspace_id: str, created_by: str, user_role: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        assigned_to = data.get("assigned_to") or created_by
        if user_role == "Employee" and str(assigned_to) != created_by:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employees can only schedule events for themselves."
            )

        cursor.execute(
            '''
            INSERT INTO events (workspace_id, created_by, assigned_to, lead_id, type, title, notes, scheduled_at, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending')
            RETURNING id, workspace_id, created_by, assigned_to, lead_id, type, title, notes, scheduled_at, status, created_at, updated_at;
            ''',
            (workspace_id, created_by, str(assigned_to), data.get("lead_id"), data.get("type", "meeting"),
             data.get("title"), data.get("notes"), data.get("scheduled_at"))
        )
        row = cursor.fetchone()
        columns = [desc[0] for desc in cursor.description]
        conn.commit()
        
        event = dict(zip(columns, row))
        for k in ["id", "workspace_id", "created_by", "assigned_to", "lead_id"]:
            if event.get(k): event[k] = str(event[k])
        event["scheduled_at"] = event["scheduled_at"].isoformat()
        return event
    finally:
        cursor.close()
        release_db_connection(conn)

def get_events_by_workspace(workspace_id: str, user_id: str, role: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = '''
            SELECT id, workspace_id, created_by, assigned_to, lead_id, type, title, notes, scheduled_at, status, created_at, updated_at
            FROM events
            WHERE workspace_id = %s
        '''
        params = [workspace_id]

        if role == "Employee":
            query += " AND assigned_to = %s"
            params.append(user_id)

        query += " ORDER BY scheduled_at ASC;"
        
        cursor.execute(query, tuple(params))
        columns = [desc[0] for desc in cursor.description]
        events = [dict(zip(columns, row)) for row in cursor.fetchall()]

        for e in events:
            for k in ["id", "workspace_id", "created_by", "assigned_to", "lead_id"]:
                if e.get(k): e[k] = str(e[k])
            e["scheduled_at"] = e["scheduled_at"].isoformat()
        return events
    finally:
        cursor.close()
        release_db_connection(conn)

def update_event(event_id: str, workspace_id: str, user_id: str, role: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT assigned_to, created_by FROM events WHERE id = %s AND workspace_id = %s;", (event_id, workspace_id))
        event_check = cursor.fetchone()
        if not event_check:
            raise HTTPException(status_code=404, detail="Event not found in this workspace.")
        
        if role == "Employee" and str(event_check[0]) != user_id and str(event_check[1]) != user_id:
            raise HTTPException(status_code=403, detail="You do not have permission to edit this event.")

        update_fields = []
        params = []
        for key, value in data.items():
            if value is not None:
                update_fields.append(f"{key} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update.")

        params.extend([event_id, workspace_id])
        query = f'''
            UPDATE events 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s AND workspace_id = %s
            RETURNING id, workspace_id, created_by, assigned_to, lead_id, type, title, notes, scheduled_at, status;
        '''
        
        cursor.execute(query, tuple(params))
        row = cursor.fetchone()
        columns = [desc[0] for desc in cursor.description]
        conn.commit()
        
        res = dict(zip(columns, row))
        for k in ["id", "workspace_id", "created_by", "assigned_to", "lead_id"]:
            if res.get(k): res[k] = str(res[k])
        res["scheduled_at"] = res["scheduled_at"].isoformat()
        return res
    finally:
        cursor.close()
        release_db_connection(conn)

def delete_event(event_id: str, workspace_id: str, user_id: str, role: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT created_by FROM events WHERE id = %s AND workspace_id = %s;", (event_id, workspace_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Event not found.")
        
        if role == "Employee" and str(row[0]) != user_id:
            raise HTTPException(status_code=403, detail="Only the creator or a manager can delete this event.")

        cursor.execute("DELETE FROM events WHERE id = %s AND workspace_id = %s;", (event_id, workspace_id))
        conn.commit()
        return {"status": "success", "message": "Event deleted successfully."}
    finally:
        cursor.close()
        release_db_connection(conn)
import logging
import psycopg2.extras
from src.database import get_db_connection, release_db_connection


logger = logging.getLogger(__name__)

def get_stats(user_id: str, start_date: str = None, end_date: str = None):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        date_filter = ""
        params = [user_id]
        
        if start_date and end_date:
            date_filter = "AND created_at >= %s AND created_at <= %s"
            params.extend([start_date, end_date])
            
        # 1. KPIs: total, new, converted and conversion rate
        cursor.execute(f"""
            SELECT 
                COUNT(*) as total_leads,
                SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_leads,
                SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted_leads
            FROM leads WHERE user_id = %s {date_filter}
        """, tuple(params))
        kpis = cursor.fetchone()

        # 2. Pipeline funnel grouped by status
        cursor.execute(f"""
            SELECT status as name, COUNT(*) as value 
            FROM leads WHERE user_id = %s {date_filter}
            GROUP BY status ORDER BY value DESC
        """, tuple(params))
        funnel = cursor.fetchall()

        # 3. Lead source distribution
        cursor.execute(f"""
            SELECT source as name, COUNT(*) as value 
            FROM leads WHERE user_id = %s {date_filter}
            GROUP BY source ORDER BY value DESC
        """, tuple(params))
        sources = cursor.fetchall()

        # 4. Leads over time grouped by day
        cursor.execute(f"""
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM leads WHERE user_id = %s {date_filter}
            GROUP BY DATE(created_at) ORDER BY date ASC
        """, tuple(params))
        chart = cursor.fetchall()

        for row in chart:
            row['date'] = str(row['date'])

        total = kpis['total_leads'] or 0
        converted = kpis['converted_leads'] or 0
        conversion_rate = round((converted / total * 100), 1) if total > 0 else 0

        return {
            "kpis": {
                "total": total,
                "new": kpis['new_leads'] or 0,
                "converted": converted,
                "conversion_rate": conversion_rate
            },
            "funnel": funnel,
            "sources": sources,
            "chart": chart
        }
    finally:
        cursor.close()
        release_db_connection(conn)
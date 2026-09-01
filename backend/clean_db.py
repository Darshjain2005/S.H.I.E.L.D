import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'agentic_soc.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("DELETE FROM incidents WHERE ai_summary LIKE '%failed%' OR ai_summary LIKE '%Unknown%' OR ai_summary IS NULL")
deleted = c.rowcount
conn.commit()
conn.close()
print(f"Cleaned up {deleted} old failed incidents")

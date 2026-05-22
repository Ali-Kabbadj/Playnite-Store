import psycopg2
from psycopg2.extras import DictCursor

# --- DATABASE CONFIGURATION ---
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "playnitedb"
DB_USER = "postgres"
DB_PASS = "3248"

OUTPUT_FILE = "db_full_report.txt"

def get_db_report():
    print(f"Connecting to {DB_NAME}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor(cursor_factory=DictCursor)
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(f"--- FULL POSTGRESQL DATABASE REPORT FOR: {DB_NAME} ---\n\n")

            # 1. GET TABLES AND ESTIMATED ROW COUNTS
            print("Fetching tables and row counts...")
            f.write("=== TABLES & ESTIMATED ROW COUNTS ===\n")
            cur.execute("""
                SELECT relname as table_name, reltuples::bigint as est_rows
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relkind = 'r'
                ORDER BY table_name;
            """)
            tables = cur.fetchall()
            for row in tables:
                f.write(f"- {row['table_name']}: ~{row['est_rows']} rows\n")
            f.write("\n")

            # 2. GET COLUMNS
            print("Fetching schema details...")
            f.write("=== SCHEMA (COLUMNS) ===\n")
            cur.execute("""
                SELECT table_name, column_name, data_type, character_maximum_length, 
                       is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position;
            """)
            for row in cur.fetchall():
                length = f"({row['character_maximum_length']})" if row['character_maximum_length'] else ""
                null = "NULL" if row['is_nullable'] == 'YES' else "NOT NULL"
                default = f" DEFAULT {row['column_default']}" if row['column_default'] else ""
                f.write(f"{row['table_name']}.{row['column_name']} : {row['data_type']}{length} {null}{default}\n")
            f.write("\n")

            # 3. GET INDEXES (Crucial for performance)
            print("Fetching indexes...")
            f.write("=== INDEXES ===\n")
            cur.execute("""
                SELECT tablename, indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                ORDER BY tablename, indexname;
            """)
            for row in cur.fetchall():
                f.write(f"Table: {row['tablename']} | Index: {row['indexname']}\n")
                f.write(f"  Def: {row['indexdef']}\n")
            f.write("\n")

            # 4. GET TRIGGERS
            print("Fetching triggers...")
            f.write("=== TRIGGERS ===\n")
            cur.execute("""
                SELECT event_object_table, trigger_name, action_statement, action_timing, event_manipulation
                FROM information_schema.triggers
                WHERE trigger_schema = 'public'
                ORDER BY event_object_table;
            """)
            for row in cur.fetchall():
                f.write(f"Table: {row['event_object_table']} | Trigger: {row['trigger_name']} ({row['action_timing']} {row['event_manipulation']})\n")
                f.write(f"  Action: {row['action_statement']}\n")
            f.write("\n")

            # 5. GET CUSTOM FUNCTIONS (Stored Procedures)
            print("Fetching custom functions...")
            f.write("=== CUSTOM FUNCTIONS ===\n")
            cur.execute("""
                SELECT p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
                FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
            """)
            functions = cur.fetchall()
            if not functions:
                f.write("No custom functions found in public schema.\n")
            for row in functions:
                f.write(f"-- Function: {row['function_name']}\n")
                f.write(f"{row['definition']}\n\n")
            f.write("\n")

            # 6. GET VIEWS / MATERIALIZED VIEWS
            print("Fetching views...")
            f.write("=== VIEWS & MATERIALIZED VIEWS ===\n")
            cur.execute("""
                SELECT matviewname as view_name, definition 
                FROM pg_matviews 
                WHERE schemaname = 'public'
                UNION ALL
                SELECT viewname as view_name, definition 
                FROM pg_views 
                WHERE schemaname = 'public';
            """)
            views = cur.fetchall()
            if not views:
                f.write("No views or materialized views found.\n")
            for row in views:
                f.write(f"-- View: {row['view_name']}\n")
                f.write(f"{row['definition']}\n\n")

        print(f"\nDone! Report generated successfully: {OUTPUT_FILE}")
        
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if 'conn' in locals() and conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    get_db_report()
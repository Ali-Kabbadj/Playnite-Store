import psycopg2

DB_DSN = 'host=localhost dbname=GamesDB user=postgres password=3248'

def dump_schema():
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    out = []

    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
    tables = [r[0] for r in cur.fetchall()]

    for table in tables:
        out.append(f"=== TABLE: {table} ===")
        
        # Columns
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = %s 
            ORDER BY ordinal_position;
        """, (table,))
        
        for col, dtype, is_null, default in cur.fetchall():
            null_str = "NULL" if is_null == "YES" else "NOT NULL"
            def_str = f" DEFAULT {default}" if default else ""
            out.append(f"  - {col} : {dtype} {null_str}{def_str}")

        # Constraints (PK, FK, Unique)
        cur.execute("""
            SELECT tc.constraint_type, tc.constraint_name, kcu.column_name, 
                   ccu.table_name AS f_table, ccu.column_name AS f_col
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
            WHERE tc.table_schema = 'public' AND tc.table_name = %s;
        """, (table,))
        
        constraints = cur.fetchall()
        if constraints:
            out.append("  Constraints:")
            for ctype, cname, col, ftable, fcol in constraints:
                if ctype == 'FOREIGN KEY':
                    out.append(f"    - FK: {col} -> {ftable}({fcol})")
                elif ctype == 'PRIMARY KEY':
                    out.append(f"    - PK: {col}")
                elif ctype == 'UNIQUE':
                    out.append(f"    - UNIQUE: {col}")
        out.append("")

    cur.execute("SELECT table_name, view_definition FROM information_schema.views WHERE table_schema = 'public';")
    views = cur.fetchall()
    if views:
        out.append("=== VIEWS ===")
        for vname, vdef in views:
            out.append(f"-- {vname}\n{vdef.strip()}\n")

    cur.execute("SELECT event_object_table, trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE trigger_schema = 'public';")
    triggers = cur.fetchall()
    if triggers:
        out.append("=== TRIGGERS ===")
        for table, name, event, action in triggers:
            out.append(f"-- {name} ON {table} ({event})\n{action}\n")

    cur.close()
    conn.close()

    with open("db_schema.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    
    print("Schema dumped successfully to db_schema.txt")

if __name__ == '__main__':
    dump_schema()
import psycopg2

DB_CONFIG = {"dbname": "playnitedb", "user": "postgres", "password": "3248", "host": "localhost"}


def get_connection():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    return conn


def setup_game_logos_table(conn):
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS game_logos (
            game_id BIGINT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
            url TEXT NOT NULL
        );
    """)
    conn.commit()
    cur.close()


def setup_game_meta_table(conn):
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS game_meta (
            game_id BIGINT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
            summary TEXT,
            storyline TEXT,
            release_date TEXT,
            developer TEXT,
            publisher TEXT,
            background_url TEXT,
            website TEXT,
            genre_names TEXT[],
            last_updated TIMESTAMP DEFAULT NOW()
        );
    """)
    cur.execute("""
        ALTER TABLE games ADD COLUMN IF NOT EXISTS background_url TEXT;
    """)
    conn.commit()
    cur.close()


def get_missing_logo_games(conn):
    cur = conn.cursor()
    cur.execute("""
        SELECT g.id, g.name, gel.url, gel.uid
        FROM games g
        LEFT JOIN game_external_links gel ON gel.game_id = g.id AND gel.source_name ILIKE '%steam%'
        WHERE g.id NOT IN (SELECT game_id FROM game_logos)
        ORDER BY gel.uid NULLS LAST
    """)
    games = cur.fetchall()
    cur.close()
    return games


def get_games_missing_metadata(conn):
    cur = conn.cursor()
    cur.execute("""
        SELECT g.id, g.name, gel.url, gel.uid
        FROM games g
        LEFT JOIN game_external_links gel ON gel.game_id = g.id AND gel.source_name ILIKE '%steam%'
        WHERE (g.summary IS NULL OR g.background_url IS NULL)
        AND g.id NOT IN (SELECT game_id FROM game_meta)
        ORDER BY gel.uid NULLS LAST
    """)
    games = cur.fetchall()
    cur.close()
    return games


def insert_logo(conn, game_id, url):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO game_logos (game_id, url) VALUES (%s, %s) ON CONFLICT DO NOTHING",
        (game_id, url),
    )
    conn.commit()
    cur.close()


def upsert_meta(conn, game_id, meta):
    fields = []
    values = []
    for key in ("summary", "storyline", "release_date", "developer", "publisher", "background_url", "website", "genre_names"):
        if key in meta and meta[key] is not None:
            fields.append(key)
            values.append(meta[key])

    if not fields:
        return

    set_clause = ", ".join(f"{f} = EXCLUDED.{f}" for f in fields)
    cols = ", ".join(fields)
    placeholders = ", ".join("%s" for _ in fields)

    cur = conn.cursor()
    cur.execute(f"""
        INSERT INTO game_meta (game_id, {cols}, last_updated)
        VALUES (%s, {placeholders}, NOW())
        ON CONFLICT (game_id) DO UPDATE SET
            {set_clause},
            last_updated = NOW()
    """, (game_id, *values))
    conn.commit()
    cur.close()

    if meta.get("summary"):
        cur = conn.cursor()
        cur.execute("UPDATE games SET summary = %s WHERE id = %s AND summary IS NULL", (meta["summary"], game_id))
        conn.commit()
        cur.close()

    if meta.get("background_url"):
        cur = conn.cursor()
        cur.execute("UPDATE games SET background_url = %s WHERE id = %s AND background_url IS NULL", (meta["background_url"], game_id))
        conn.commit()
        cur.close()

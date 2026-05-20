import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from .config import get_settings

settings = get_settings()

DSN = (
    f"host={settings.db_host} "
    f"port={settings.db_port} "
    f"dbname={settings.db_name} "
    f"user={settings.db_user} "
    f"password={settings.db_password} "
    f"options=-csearch_path={settings.db_schema}"
)


@contextmanager
def get_db():
    conn = psycopg2.connect(DSN, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()


def fetchall(query: str, params: tuple = ()) -> list[dict]:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]


def fetchone(query: str, params: tuple = ()) -> dict | None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None


def execute(query: str, params: tuple = ()) -> int:
    """Run INSERT/UPDATE/DELETE and return affected row count."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            affected = cur.rowcount
        conn.commit()
        return affected

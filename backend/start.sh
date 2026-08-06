#!/bin/bash

# ── Construir DATABASE_URL desde variables PG de Railway ──
if [ -n "$PGHOST" ]; then
    PGPASSWORD_ENCODED=$(python -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$PGPASSWORD" 2>/dev/null || echo "$PGPASSWORD")
    export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD_ENCODED}@${PGHOST}:${PGPORT}/${PGDATABASE}"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL no está configurada. Abortando."
    exit 1
fi

# ── Esperar a que PostgreSQL esté listo ──
HOST="${PGHOST:-${DB_HOST:-localhost}}"
PORT="${PGPORT:-${DB_PORT:-5432}}"
echo "Waiting for PostgreSQL at $HOST:$PORT..."
for i in 1 2 3 4 5 6 7 8 9 10 15 20; do
    if python -c "import psycopg2; psycopg2.connect(host='$HOST', port=$PORT, user='$PGUSER', password='$PGPASSWORD', dbname='$PGDATABASE')" 2>/dev/null; then
        echo "PostgreSQL is ready"
        break
    fi
    echo "  attempt $i... sleeping"
    sleep 2
done

python manage.py migrate --noinput
python manage.py seed_data
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 4 --timeout 120 --access-logfile -

#!/bin/bash
set -e

HOST="${PGHOST:-${DB_HOST:-localhost}}"
PORT="${PGPORT:-${DB_PORT:-5432}}"
USER="${PGUSER:-${DB_USER:-postgres}}"
PASS="${PGPASSWORD:-${DB_PASSWORD:-}}"
DB="${PGDATABASE:-${DB_NAME:-postgres}}"

echo "Waiting for PostgreSQL at $HOST:$PORT..."
i=1
while [ $i -le 30 ]; do
    if python -c "import psycopg2; psycopg2.connect(host='$HOST', port=$PORT, user='$USER', password='$PASS', dbname='$DB')" 2>/dev/null; then
        echo "PostgreSQL is ready"
        break
    fi
    echo "  attempt $i... sleeping"
    sleep 2
    i=$((i + 1))
done

python manage.py migrate --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 4 --timeout 120 --access-logfile -

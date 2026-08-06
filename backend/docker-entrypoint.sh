#!/bin/sh
set -e

# Ejecutar migraciones, sembrar datos iniciales y recopilar archivos estáticos antes de iniciar el servidor
python manage.py migrate --noinput
python manage.py seed_data
python manage.py collectstatic --noinput

exec "$@"

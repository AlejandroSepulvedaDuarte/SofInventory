# =========================================
# ETAPA 1: Compilar Frontend Angular
# =========================================
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build -- --configuration=production

# =========================================
# ETAPA 2: Construir Backend Django
# =========================================
FROM python:3.11-slim
WORKDIR /app

# Dependencias del sistema para PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Dependencias Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código del backend
COPY backend/ .

# Copiar el build de Angular dentro de Django
COPY --from=frontend-build /frontend/dist/erp-frontend/browser /app/frontend_dist

# Build-time SECRET_KEY para collectstatic
ARG SECRET_KEY=build-key-only
ENV SECRET_KEY=$SECRET_KEY

RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Arranca migraciones + seed data + Gunicorn
CMD python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 4 --timeout 120 --access-logfile -

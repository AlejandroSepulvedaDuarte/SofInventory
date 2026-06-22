# =========================================
# ETAPA 1: Compilar Frontend Angular
# =========================================
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

COPY frontend/package*.json ./
ENV NODE_OPTIONS="--max-old-space-size=512"
RUN npm ci --no-optional --no-audit --no-fund

COPY frontend/ .
RUN npm run build -- --configuration=production

# =========================================
# ETAPA 2: Construir Backend Django
# =========================================
FROM python:3.12-slim
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

# Copiar webfonts de Font Awesome (Angular no siempre las copia al output)
COPY --from=frontend-build /frontend/node_modules/@fortawesome/fontawesome-free/webfonts /app/frontend_dist/webfonts

# Build-time SECRET_KEY para collectstatic
ARG SECRET_KEY=build-key-only
ENV SECRET_KEY=$SECRET_KEY

RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Script de inicio con wait para PostgreSQL
RUN chmod +x start.sh
CMD ["./start.sh"]

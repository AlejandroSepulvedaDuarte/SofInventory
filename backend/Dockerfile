# 1. Usar una imagen oficial de Python ligera
FROM python:3.11-slim

# 2. Configurar variables de entorno para que Python sea eficiente en Docker
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 4. Instalar dependencias del sistema necesarias (por si usas librerías pesadas de Postgres)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 5. Copiar el archivo de requerimientos e instalar las librerías de Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copiar todo el código de tu proyecto de Django al contenedor
COPY . /app/

# 7. SECRET_KEY temporal para build (collectstatic necesita una)
# En producción Railway/Render inyectan la real via variable de entorno
ARG SECRET_KEY=insecure-build-key
ENV SECRET_KEY=$SECRET_KEY

# 8. Recopilar archivos estáticos para producción (WhiteNoise)
RUN python manage.py collectstatic --noinput

# 9. Exponer el puerto por donde corre Django
EXPOSE 8000

# 10. Comando para arrancar con Gunicorn en producción
# Ejecuta migraciones (incluye datos semilla) y luego inicia el servidor
# Usa $PORT (Render/Railway lo inyectan automáticamente)
CMD python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 4 --timeout 120 --access-logfile -
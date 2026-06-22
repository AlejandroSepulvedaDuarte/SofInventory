# 1. Usar una imagen oficial de Python ligera
FROM python:3.12-slim

# 2. Configurar variables de entorno para que Python sea eficiente en Docker
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 4. Instalar dependencias del sistema necesarias para Postgres y compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 5. Copiar el archivo de requerimientos e instalar las librerías de Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copiar todo el código de tu proyecto de Django al contenedor
COPY . /app/

# 7. Copiar el entrypoint para ejecutar migraciones antes de iniciar el servidor
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 8. Exponer el puerto de la aplicación
EXPOSE 8000

# 9. Ejecutar migraciones y luego Gunicorn en producción
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:8000", "config.wsgi:application"]
# Etapa 1: Compilar la aplicación de Angular
FROM node:20-alpine AS build
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código y compilar para producción
COPY . .
RUN npm run build -- --configuration=production

# Etapa 2: Servir los archivos con Nginx
FROM nginx:alpine

# gettext provee envsubst para reemplazar variables en templates
RUN apk add --no-cache gettext

# Copiar template de nginx (contiene ${BACKEND_URL})
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados de Angular
# NOTA: En angular.json el outputPath es "dist/erp-frontend"
COPY --from=build /app/dist/erp-frontend/browser /usr/share/nginx/html

EXPOSE 80

# Reemplazar ${BACKEND_URL} en nginx.conf, default http://backend:8000
# Luego iniciar nginx en primer plano
CMD sh -c 'export BACKEND_URL="${BACKEND_URL:-http://backend:8000}" && \
  envsubst '"'"'${BACKEND_URL}'"'"' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp && \
  mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf && \
  nginx -g "daemon off;"'
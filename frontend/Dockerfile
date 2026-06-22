# Etapa 1: Compilar la aplicación de Angular
FROM node:20-alpine AS build
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar el código y compilar para producción
COPY . .
RUN npm run build -- --configuration=production

# Etapa 2: Servir los archivos con Nginx
FROM nginx:alpine

# Copiar la configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados de Angular al directorio web de Nginx
COPY --from=build /app/dist/erp-frontend/browser /usr/share/nginx/html

# Generar configuración runtime para la URL de la API y arrancar NGINX
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
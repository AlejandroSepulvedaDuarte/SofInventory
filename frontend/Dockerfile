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

# Copiar la configuración que creamos en el Paso 1
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados de Angular al directorio web de Nginx
# NOTA: Verifica que en tu angular.json el outputPath sea "dist/erp-frontend"
COPY --from=build /app/dist/erp-frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
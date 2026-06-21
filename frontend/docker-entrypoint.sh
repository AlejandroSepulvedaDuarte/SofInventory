#!/bin/sh

# Usa BACKEND_URL si está definida, sino usa localhost:8000
: "${BACKEND_URL:=http://localhost:8000}"

# Reemplazar placeholder en nginx.conf con la URL del backend
sed -i "s|__BACKEND_URL__|${BACKEND_URL}|g" /etc/nginx/conf.d/default.conf

# env.js con API_URL = misma-origen (nginx proxy_pass resuelve /api)
cat > /usr/share/nginx/html/assets/env.js <<EOF
window.__env__ = {
  apiUrl: "/api"
};
EOF

exec "$@"

#!/bin/sh

: "${API_URL:=http://localhost:8000/api}"

cat > /usr/share/nginx/html/assets/env.js <<EOF
window.__env__ = {
  apiUrl: "${API_URL}"
};
EOF

exec "$@"

# 📮 Evidencias — Postman | Módulo Login

> Directorio para capturas de requests y responses realizadas en Postman durante las pruebas del módulo de Login.

## Convención de nomenclatura

```
TC-LOGIN-{NRO}-postman.png     → Captura del request + response en Postman
```

## Endpoints — Colección de referencia

### Autenticación (Login)
```
POST /api/auth/login/
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123"
}
```

### Verificar sesión activa
```
GET /api/auth/me/
Authorization: Bearer {{access_token}}
```

### Logout
```
POST /api/auth/logout/
Authorization: Bearer {{access_token}}
```

### Ejemplo de respuesta exitosa (200 OK)
```json
{
  "mensaje": "Bienvenido Carlos Pérez",
  "access_token": "abc123...xyz",
  "expires_at": "2026-05-15T03:00:00+00:00",
  "usuario": {
    "id": 1,
    "username": "admin",
    "nombre": "Carlos Pérez",
    "rol": "Administrador",
    "estado": "activo",
    "email": "admin@sofinventory.com"
  }
}
```

## Archivos esperados

| Archivo | Caso | Código HTTP esperado |
|---------|------|---------------------|
| `TC-LOGIN-001-postman.png` | TC-LOGIN-001 | 200 OK + access_token (admin) |
| `TC-LOGIN-002-postman.png` | TC-LOGIN-002 | 200 OK + access_token (supervisor) + verificación 403 en `/api/usuarios/listar/` |
| `TC-LOGIN-003-postman.png` | TC-LOGIN-003 | 401 Unauthorized — username no registrado |
| `TC-LOGIN-004-postman.png` | TC-LOGIN-004 | 400 Bad Request — campos vacíos |
| `TC-LOGIN-005-postman.png` | TC-LOGIN-005 | 403 Forbidden — usuario inactivo |
| `TC-LOGIN-006-postman.png` | TC-LOGIN-006 | 401 Unauthorized — contraseña incorrecta |
| `TC-LOGIN-007-postman.png` | TC-LOGIN-007 | **500 Internal Server Error (BUG — se esperaba 400)** |
| `TC-LOGIN-008-postman.png` | TC-LOGIN-008 | 401 Unauthorized — token revocado |
| `TC-LOGIN-009-postman.png` | TC-LOGIN-009 | 401 Unauthorized — sin header Authorization |
| `TC-LOGIN-010-postman.png` | TC-LOGIN-010 | 401 Unauthorized — sesión expirada (backend correcto) |

> 📌 **Nota:** Incluir en cada captura el body del request, los headers completos y el body del response. Configurar una variable de entorno `{{access_token}}` en Postman para reutilizar el token entre peticiones.

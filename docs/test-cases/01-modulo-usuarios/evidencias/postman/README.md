# 📮 Evidencias — Postman | Módulo Usuarios

> Directorio para capturas de requests y responses realizadas en Postman durante las pruebas del módulo de Usuarios.

## Convención de nomenclatura

```
TC-USR-{NRO}-postman.png     → Captura del request + response en Postman
```

## Configuración de Autenticación en Postman

Todos los endpoints de usuarios requieren un token Bearer de administrador. Configurar en Postman:

```
Authorization: Bearer <token_obtenido_del_login>
```

O usar una variable de entorno:
```
Authorization: Bearer {{access_token}}
```

## Archivos esperados

| Archivo | Caso | Método | Endpoint | Código esperado |
|---------|------|--------|----------|----------------|
| `TC-USR-001-postman.png` | TC-USR-001 | POST | `/api/usuarios/crear/` | 201 Created |
| `TC-USR-002-postman.png` | TC-USR-002 | POST | `/api/usuarios/crear/` | 201 Created |
| `TC-USR-003-postman.png` | TC-USR-003 | POST | `/api/usuarios/crear/` | 400 Bad Request (username duplicado) |
| `TC-USR-004-postman.png` | TC-USR-004 | POST | `/api/usuarios/crear/` | 400 Bad Request (contraseña débil) |
| `TC-USR-005-postman.png` | TC-USR-005 | POST | `/api/usuarios/crear/` | **201 sin error — BUG esperado** |
| `TC-USR-006-postman.png` | TC-USR-006 | POST | `/api/usuarios/crear/` | 400 Bad Request (campos vacíos) |
| `TC-USR-008-postman.png` | TC-USR-008 | POST | `/api/auth/login/` | 200 OK + access_token |

## Body de referencia para crear usuario (TC-USR-001)

```json
{
  "tipo_documento": 1,
  "numero_documento": "1234567890",
  "nombre_completo": "Carlos Pérez",
  "email": "carlos.perez@sofinventory.com",
  "username": "carlos.perez",
  "password": "Admin@1234",
  "rol": 1,
  "fecha_creacion": "2026-05-14",
  "estado": "activo"
}
```

## Respuesta esperada (201 Created)

```json
{
  "mensaje": "Usuario creado exitosamente"
}
```

> 📌 **Nota:** Incluir en las capturas el body del request, los headers (especialmente `Authorization`) y el body completo del response. Importar la colección `SofInventory-Usuarios.postman_collection.json` para reproducir las pruebas.

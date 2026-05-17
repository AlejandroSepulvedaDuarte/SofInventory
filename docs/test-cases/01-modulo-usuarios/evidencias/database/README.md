# 🗄️ Evidencias — Base de Datos | Módulo Usuarios

> Directorio para capturas de consultas SQL ejecutadas en **pgAdmin 4** para verificar la integridad de los datos en la base de datos PostgreSQL de SofInventory.

## Convención de nomenclatura

```
TC-USR-{NRO}-db.png     → Captura del Query Tool de pgAdmin con SQL ejecutado + resultado
```

## Consultas SQL de Referencia

```sql
-- TC-USR-001: Verificar usuario administrador creado
SELECT id, username, email, nombre_completo, estado, fecha_registro
FROM usuarios
WHERE username = 'carlos';

-- TC-USR-002: Verificar rol del usuario operador
SELECT u.username, u.email, r.nombre AS rol, u.estado
FROM usuarios u
INNER JOIN roles r ON u.rol_id = r.id
WHERE u.username = 'laura.gomez';

-- TC-USR-003: Verificar que NO existen dos usuarios con el mismo username
SELECT username, COUNT(*) AS total
FROM usuarios
GROUP BY username
HAVING COUNT(*) > 1;

-- TC-USR-005: Verificar número de documento inválido en BD (BUG)
SELECT id, username, numero_documento
FROM usuarios
ORDER BY id DESC
LIMIT 5;

-- TC-USR-007: Verificar hash PBKDF2 de contraseña (NO debe aparecer en texto plano)
SELECT username, password
FROM usuarios
WHERE username = 'carlos.perez';
-- Resultado esperado: pbkdf2_sha256$<iteraciones>$<salt>$<hash_base64>

-- Verificar todos los usuarios activos
SELECT u.id, u.username, u.email, r.nombre AS rol, u.estado, u.fecha_registro
FROM usuarios u
INNER JOIN roles r ON u.rol_id = r.id
WHERE u.estado = 'activo'
ORDER BY u.fecha_registro DESC;
```

## Archivos esperados

| Archivo | Caso | Consulta | Resultado esperado |
|---------|------|----------|--------------------|
| `TC-USR-001-db.png` | TC-USR-001 | SELECT por username | 1 registro con datos correctos |
| `TC-USR-002-db.png` | TC-USR-002 | SELECT con JOIN a roles | Rol = Operador |
| `TC-USR-005-db.png` | TC-USR-005 | SELECT numero_documento | **Valor `ABCDE!!!` persistido (BUG)** |
| `TC-USR-007-db.png` | TC-USR-007 | SELECT password | Hash `pbkdf2_sha256$...` — sin texto plano |

> 📌 **Nota:** Incluir siempre en la captura el SQL ejecutado (panel superior del Query Tool) y el resultado (panel inferior). Usar pgAdmin 4 conectado a la base de datos de SofInventory.

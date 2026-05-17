# 🗄️ Evidencias — Base de Datos | Módulo Login

> Directorio para capturas de consultas SQL ejecutadas en **pgAdmin 4** para verificar el estado de las sesiones y tokens durante las pruebas del módulo de Login.

## Convención de nomenclatura

```
TC-LOGIN-{NRO}-db.png     → Captura del Query Tool de pgAdmin con SQL ejecutado + resultado
```

## Consultas SQL de Referencia

```sql
-- TC-LOGIN-001: Verificar sesión activa creada tras login exitoso
SELECT s.id, u.username, s.token, s.creada_en, s.expira_en, s.activa, s.user_agent
FROM sesiones_api s
INNER JOIN usuarios u ON s.usuario_id = u.id
WHERE u.username = 'admin'
ORDER BY s.creada_en DESC
LIMIT 1;

-- TC-LOGIN-005: Verificar estado inactivo del usuario
SELECT username, estado
FROM usuarios
WHERE username = 'inactivo';

-- TC-LOGIN-008: Verificar token revocado tras logout
SELECT token, activa, ultima_actividad
FROM sesiones_api
WHERE token = '<token_usado_en_la_prueba>';
-- Resultado esperado: activa = false

-- TC-LOGIN-010: Forzar expiración de sesión para la prueba
UPDATE sesiones_api
SET expira_en = NOW() - INTERVAL '1 hour'
WHERE activa = true
AND usuario_id = (SELECT id FROM usuarios WHERE username = 'admin');

-- TC-LOGIN-010: Verificar que la sesión quedó inactiva tras expiración
SELECT token, expira_en, activa
FROM sesiones_api
WHERE usuario_id = (SELECT id FROM usuarios WHERE username = 'admin')
ORDER BY creada_en DESC
LIMIT 1;
-- Resultado esperado: activa = false

-- Ver historial de sesiones de un usuario
SELECT s.id, u.username, s.creada_en, s.expira_en, s.activa
FROM sesiones_api s
INNER JOIN usuarios u ON s.usuario_id = u.id
ORDER BY s.creada_en DESC
LIMIT 10;
```

## Archivos esperados

| Archivo | Caso | Consulta | Propósito |
|---------|------|----------|-----------|
| `TC-LOGIN-001-db.png` | TC-LOGIN-001 | SELECT sesiones_api | Verificar token activo generado tras login |
| `TC-LOGIN-008-db.png` | TC-LOGIN-008 | SELECT token | Verificar `activa = false` tras logout |
| `TC-LOGIN-010-db.png` | TC-LOGIN-010 | UPDATE + SELECT | Forzar expiración y verificar `activa = false` |

> 📌 **Nota:** Incluir en la captura tanto el SQL ejecutado (panel superior) como el resultado completo (panel inferior) del Query Tool de pgAdmin 4. Solo agregar capturas cuando la verificación en BD sea relevante para el caso de prueba.

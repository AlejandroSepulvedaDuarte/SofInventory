# Evidencias de base de datos — Usuarios

> **Actualizado:** 8 de agosto de 2026

No se ejecutaron consultas manuales ni se generaron capturas nuevas de PostgreSQL durante esta actualización. La suite backend utilizó SQLite en memoria y no modificó la base operativa.

## Consultas de solo lectura recomendadas

```sql
-- Duplicados por nombre de usuario, sin mostrar datos completos.
SELECT LOWER(username) AS clave, COUNT(*) AS total
FROM usuarios
GROUP BY LOWER(username)
HAVING COUNT(*) > 1;

-- Distribución agregada por rol y estado.
SELECT r.nombre AS rol, u.estado, COUNT(*) AS total
FROM usuarios u
JOIN roles r ON r.id = u.rol_id
GROUP BY r.nombre, u.estado
ORDER BY r.nombre, u.estado;

-- Conteo de eventos por acción, sin detalle potencialmente identificable.
SELECT accion, COUNT(*) AS total
FROM auditoria_usuarios
GROUP BY accion
ORDER BY accion;
```

Nunca seleccionar ni capturar la columna `password`, tokens de sesión, correos, documentos u otros datos personales salvo que exista una necesidad formal y una salida redactada.

Los archivos `TC-USR-001-db.png`, `TC-USR-002-db.png`, `TC-USR-005-db.png` y `TC-USR-007-db.png` son históricos. Las imágenes que muestran un documento inválido o reglas antiguas no representan el comportamiento actual.

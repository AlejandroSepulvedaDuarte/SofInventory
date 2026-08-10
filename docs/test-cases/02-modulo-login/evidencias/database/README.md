# Evidencias de base de datos — Login y sesiones

> **Actualizado:** 8 de agosto de 2026

No se realizaron actualizaciones manuales ni capturas nuevas de PostgreSQL. La sesión utilizada para la comprobación visual se creó y cerró mediante la interfaz normal.

## Consultas de solo lectura recomendadas

```sql
-- Conteo de sesiones por estado, sin mostrar tokens.
SELECT activa, COUNT(*) AS total
FROM sesiones_api
GROUP BY activa;

-- Metadatos de la sesión más reciente para un usuario ficticio.
SELECT s.creada_en, s.expira_en, s.activa, s.ultima_actividad
FROM sesiones_api s
JOIN usuarios u ON u.id = s.usuario_id
WHERE u.username = '<usuario-ficticio>'
ORDER BY s.creada_en DESC
LIMIT 1;
```

No seleccionar ni capturar la columna `token`. La expiración debe probarse con reloj controlado o una base aislada; no mediante `UPDATE` sobre datos existentes.

Los archivos `TC-LOGIN-001-db.png`, `TC-LOGIN-008-db.png` y `TC-LOGIN-010-db.png` son históricos y están pendientes de revalidación.

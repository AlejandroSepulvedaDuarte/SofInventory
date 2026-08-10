# Evidencia automatizada y de integración — 8 de agosto de 2026

Este manifiesto conserva resultados sanitizados. No incluye contraseñas, tokens, cookies, encabezados `Authorization`, datos personales ni nombres de volúmenes internos.

## Suites y compilación

| Bloque | Comando reproducible resumido | Resultado |
|---|---|---|
| Backend rápida | `python manage.py test --settings=config.test_settings --verbosity 2` dentro de la imagen backend, repositorio solo lectura | `Ran 99 tests ... OK` · 3,977 s |
| Backend PostgreSQL | Mismo `manage.py test` en contenedor backend temporal conectado a PostgreSQL 15 | `Ran 99 tests ... OK` · 69,668 s |
| Frontend Node | `npm test` en `node:20-alpine`, repositorio solo lectura | 24 aprobadas · 0 fallos |
| Angular producción | `npm ci` y `npm run build` en Node 20 Linux limpio | Build aprobado; bundle +7,02 kB y CSS Dashboard +3,05 kB sobre presupuesto |

Ambas bases de prueba backend se destruyeron al concluir. La primera tentativa de build que reutilizó `node_modules` de Windows se descartó como error de preparación; no fue un fallo del código.

## Salidas sanitizadas de integración E2E

```text
COMPRA_ANULACION_POSITIVA 200 anulada auditor=true fecha=true
INVENTARIO_CONSISTENTE 20 [('E2ED', 5), ('E2EO', 15)] 20
MOVIMIENTOS_MANUALES 15 entrada=200 salida=200 15 negativos=400/400/400 total=20
CONCURRENCIA_POSTGRES ['InventarioError', 'OK'] stock=1 cache=1
SESIONES_E2E login=200/200 primera_activa=false distintas=true activas=1 expirada=403 activa=false
USUARIOS_DUPLICADOS 400/400/400 inactivo=403 sesiones=0 eliminar_libre=200 auditoria=true
CATEGORIAS_ELIMINAR vendedor=403 libre=204 relacionada=400
PRODUCTO_EDITAR 200/200 numericos_invalidos=400 configurar_bodega=200/200 estado=403/200/200/400
IMAGEN_PRODUCTO alta=200 archivo_falso=400 preservada=true reemplazo=200 residuo=false eliminar=200 residuo=false
ALMACENES_E2E editar_bodega=200/200 vendedor=403 libre=204 con_stock=400 stock_igual=true
INVENTARIO_CONSULTAS listar=200 alertas=200 por_almacen=200 cantidad=15 csv=200 vendedor=403
COMPRAS_NEGATIVAS duplicada=400 cantidad=400 rollback=400 proveedor_inactivo=400 producto_inactivo=201 reversion=200 stock_igual=true
VENTAS_NEGATIVAS cantidad=400 stock=400 descuento=400 efectivo=400 rollback=400 entidades_inactivas=400/400/400 debito_sin_datos=201 reversion=200 stock_igual=true
PROVEEDORES_CLIENTES libres=200/200 vendedor=403/403 relacionados=500/500 persisten=true/true
EMPRESA_VALIDACION nit_telefono_invalidos=200 aceptados=true restauracion=200 singleton=409 delete=405
```

Los códigos 201/500 inesperados están vinculados a defectos abiertos; las operaciones que alteraron stock o Empresa se revirtieron de inmediato dentro del mismo entorno ficticio.

## Evidencia visual mínima

- Categoría duplicada: [CAT-duplicado-e2e.png](../03-modulo-categorias/evidencias/frontend/CAT-duplicado-e2e.png)
- Alta fallida de Producto: [PRD-alta-error-e2e.png](../04-modulo-productos/evidencias/frontend/PRD-alta-error-e2e.png)
- Compra: [detalle](../09-modulo-compras/evidencias/frontend/COM-detalle-e2e.png) y [anulación](../09-modulo-compras/evidencias/frontend/COM-anulada-e2e.png)
- Venta: [registro](../10-modulo-ventas/evidencias/frontend/VTA-registro-e2e.png), [comprobante](../10-modulo-ventas/evidencias/frontend/VTA-detalle-comprobante-e2e.png) y [anulación](../10-modulo-ventas/evidencias/frontend/VTA-anulada-e2e.png)
- Dashboard vacío: [DSH-vacio-e2e.png](../12-modulo-dashboard/evidencias/frontend/DSH-vacio-e2e.png)

Las demás capturas se indexan en el README de evidencias de cada módulo. Seguridad, permisos, concurrencia, validaciones negativas y stock no se duplican visualmente cuando `AUTO`, `API` o `DB-R` son más apropiados.

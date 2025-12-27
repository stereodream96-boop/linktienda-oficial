# API - Notas rápidas

Este documento resume los endpoints y formatos implementados en `backend/api` que afectan a las secciones dinámicas, subida de logos y filtros de inventario.

## `inventory.php`
- GET `/inventory.php?page_id=ID` → devuelve `products`.
- Soporta filtros por query string:
  - `filter=offers` → devuelve solo `on_sale = 1`.
  - `filter=featured` → devuelve solo `featured = 1`.
  - `filter=category&category=Nombre` → devuelve productos con `category = Nombre`.
- Campos de `page_products`: `id,page_id,name,price,stock,sku,category,on_sale,sale_price,featured,created_at`.

## `pages.php` — `sections_json`
- El campo `sections_json` en la tabla `pages` es un JSON array con objetos que representan secciones del home. Ejemplo:

```
[ { "value": "Ofertas destacadas" }, { "value": "Hogar" } ]
```

- Reglas de interpretación (frontend):
  - Si `value` === `Ofertas destacadas` → mostrar sección de ofertas (filtrar `inventory.php?filter=offers`).
  - Si `value` coincide con una categoría → mostrar sección por categoría (filtrar `inventory.php?filter=category&category=...`).

## `upload_logo.php`
- POST multipart/form-data con campos:
  - `page_id` (int)
  - `logo` (file): MIME permitidos `image/png`, `image/jpeg`, `image/webp`; tamaño ≤ 2MB.
- Guarda en `backend/uploads/logos/logo_<page_id>_<timestamp>.<ext>` y actualiza `pages.logo_url` con la ruta pública `/backend/uploads/logos/...`.
- Respuesta JSON: `{ "ok": true, "logo_url": "/backend/uploads/logos/....png" }` o `{ "ok": false, "message": "..." }`.

## Orden recomendado para flujo de creación (para evitar errores)
1. Crear página (`POST pages.php` sin logo).
2. Subir logo usando `upload_logo.php` con `page_id` devuelto.
3. Opcional: editar `sections_json`/productos/servicios.

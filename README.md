# Link Tienda

Proyecto minimal: frontend con React (Vite) y backend en PHP. Base de datos para usar con XAMPP (phpMyAdmin).

Pasos rápidos:

- Backend: copiar la carpeta `backend` dentro de `C:\xampp\htdocs\` o configurar un virtual host apuntando a la carpeta.
- Base de datos: importar `db/init.sql` en phpMyAdmin (o ejecutar el script desde la línea de comandos MySQL).
- Frontend: abrir `frontend` en terminal y ejecutar:

```bash
cd frontend
npm install
npm run dev
```

API de ejemplo:
- `http://localhost/backend/api/products` (si pones `backend` en `htdocs`) devolverá JSON de productos.

Credenciales por defecto para la conexión MySQL en `backend/api/products.php`:
- host: `127.0.0.1`
- usuario: `root`
- contraseña: `` (vacía)
- base de datos: `link_tienda`

Si quieres, puedo:
- Ejecutar `npm install` y `npm run dev` (si permites ejecutar comandos aquí).
- Importar `db/init.sql` a tu MySQL local (necesitaría acceso al entorno o instrucciones que ejecutes).


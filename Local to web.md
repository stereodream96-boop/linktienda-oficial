# Local to web — Guía de migración

Este instructivo explica, paso a paso, cómo mover tu proyecto desde `localhost` (entorno local con XAMPP) a un servidor web (hosting) **en producción**.

Contenido rápido:
- Respaldos (archivos + base de datos)
- Exportar / importar la base de datos
- Cambios en la configuración (datos de conexión)
- Subida de archivos (FTP/SFTP / Git / panel)
- Ajustes del frontend y CORS
- Seguridad, permisos y SSL
- Pruebas y verificación

---

## 1) Preparar respaldos

- Copia todo el directorio del proyecto (archivos PHP, `frontend`, `db`, etc.) a una carpeta de respaldo.
- Exporta la base de datos local (recomendado `mysqldump`):

```bash
mysqldump -u root -p link_tienda > link_tienda.sql
```

Guarda `link_tienda.sql` junto con el backup de archivos.

## 2) Exportar / importar la base de datos al servidor remoto

- En el hosting, crea una base de datos (por ejemplo `link_tienda`) y un usuario con contraseña. Anota:
  - Host (por ejemplo `localhost` o una IP/host del proveedor)
  - Nombre de la base de datos
  - Usuario y contraseña

- Importa el SQL desde tu equipo local al servidor. Si tienes acceso SSH en el servidor remoto:

```bash
scp link_tienda.sql usuario@tu-servidor:/tmp/
ssh usuario@tu-servidor
mysql -u dbuser -p dbname < /tmp/link_tienda.sql
```

- Si tu proveedor sólo ofrece phpMyAdmin, usa la interfaz de importación para subir `link_tienda.sql`.

## 3) Cambiar configuración de conexión en el backend

- Localmente, tu conexión estaba en `backend/api/products.php` usando:
  - host: `127.0.0.1` (o `localhost`)
  - usuario: `root`
  - password: `` (vacío)

- En producción debes apuntar a los valores del hosting. Preferible crear un archivo de configuración o usar variables de entorno. Ejemplo sencillo con `config.php` (colocar en `backend` y no subirlo a repos públicos):

```php
<?php
// backend/config.php
return [
  'db_host' => 'tu_host_remoto',
  'db_name' => 'tu_nombre_db',
  'db_user' => 'tu_usuario_db',
  'db_pass' => 'tu_contraseña_db',
  'charset' => 'utf8mb4'
];
```

Y en tus scripts reemplazar las variables hardcodeadas por la carga del archivo:

```php
$cfg = require __DIR__ . '/config.php';
$dsn = "mysql:host={$cfg['db_host']};dbname={$cfg['db_name']};charset={$cfg['charset']}";
$user = $cfg['db_user'];
$pass = $cfg['db_pass'];
```

> Nota: Si usas un panel (cPanel, Plesk, etc.), el host suele ser `localhost`. Si el proveedor separa DB en otro servidor, usa el host provisto.

## 4) Subir archivos a servidor web

Opciones comunes:
- FTP / SFTP: usa cliente (FileZilla) y sube el contenido del proyecto a la carpeta pública (`public_html`, `www` o `htdocs` según proveedor).
- Git + Deploy: conecta un hook o usa la integración del hosting.
- Panel del proveedor: sube zip y extrae en el administrador de archivos.

Recomendación: sube todo excepto archivos sensibles (por ejemplo `config.php` con credenciales si prefieres mantenerlo fuera del repo). Usa `.gitignore` para evitar subir credenciales.

## 5) Ajustes para el frontend

- Si el frontend (Vite/React) está preconstruido, ejecuta `npm run build` y sube la carpeta `dist`/`build` al hosting público.
- Si sirves el frontend desde el mismo dominio que el backend, ajusta las rutas en `index.html` a rutas relativas (ya lo hicimos: `./src/main.jsx`) o sirve archivos estáticos desde la carpeta pública.

## 6) CORS y acceso a la API

- En producción, restringe `Access-Control-Allow-Origin` a tu dominio en lugar de `*`.
  - En `backend/index.php` reemplaza `header('Access-Control-Allow-Origin: *');` por tu dominio:

```php
header('Access-Control-Allow-Origin: https://tudominio.com');
```

## 7) SSL / HTTPS

- Asegúrate de activar HTTPS en tu dominio (Let's Encrypt o certificado del proveedor).
- Actualiza las URLs del frontend a `https://...` y fuerza redirección HTTP -> HTTPS en el servidor.

## 8) Permisos y seguridad de archivos

- Asegura permisos adecuados (por ejemplo, `644` para archivos, `755` para carpetas) y que el servidor web sea dueño de las carpetas que necesite escribir (si hay uploads).
- Nunca subas credenciales en repositorios públicos.

## 9) Variables de entorno y secretos

- Si tu hosting soporta variables de entorno, almacena `DB_USER`/`DB_PASS` allí y accede desde PHP usando `getenv()`.
- Si no, usa `config.php` fuera del directorio público y con permisos restringidos.

## 10) Pruebas post-migración

- Accede a `https://tudominio.com/backend/echo.php?msg=OK` para verificar que PHP funciona.
- Prueba la API: `https://tudominio.com/api/products` y revisa que devuelva JSON.
- Revisa logs de errores si algo falla.

## 11) Comandos útiles

- Exportar DB local:
```bash
mysqldump -u root -p link_tienda > link_tienda.sql
```

- Importar en servidor (SSH):
```bash
mysql -u dbuser -p dbname < link_tienda.sql
```

- Subir vía scp:
```bash
scp -P 22 link_tienda.sql usuario@tu-servidor:/tmp/
```

## 12) Rollback rápido

- Conserva los backups de archivos y `link_tienda.sql` local. Si algo sale mal, vuelve a restaurarlos usando el mismo proceso inverso.

---

Si querés, puedo generar automáticamente:
- Un archivo `backend/config.example.php` con la plantilla de configuración.
- Un script `deploy.sh` con pasos automáticos (si tienes acceso SSH).

Archivo creado: `Local to web.md` (en la raíz del proyecto). Recomendación: léelo y dime si lo quieres más específico para tu proveedor de hosting.

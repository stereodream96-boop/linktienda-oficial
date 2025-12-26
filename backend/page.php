<?php
// backend/page.php
// Muestra una página creada desde el panel de administración (parámetro ?id=)
//
// NOTA: Esta vista es pública y está separada del panel de administración.
// No incluye componentes ni dependencias del Admin. El Admin funciona
// a través de `backend/api/pages.php` (API JSON) mientras que esta
// página sirve HTML independiente para el slug.

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$slug = isset($_GET['slug']) ? trim($_GET['slug']) : null;

// Configuración de conexión
$host = '127.0.0.1';
$db   = 'link_tienda';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo "Error de conexión a la base de datos.";
    exit;
}

if ($slug) {
    try {
        $stmt = $pdo->prepare('SELECT id, title, content, created_at FROM pages WHERE slug = :slug');
        $stmt->execute([':slug' => $slug]);
        $page = $stmt->fetch();
        if (!$page) {
            http_response_code(404);
            echo "Página no encontrada";
            exit;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo "Error al consultar la página";
        exit;
    }
} else {
    if ($id <= 0) {
        http_response_code(400);
        echo "ID inválido";
        exit;
    }

    try {
        $stmt = $pdo->prepare('SELECT id, title, content, created_at FROM pages WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $page = $stmt->fetch();
        if (!$page) {
            http_response_code(404);
            echo "Página no encontrada";
            exit;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo "Error al consultar la página";
        exit;
    }
}

$title = htmlspecialchars($page['title'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$content = htmlspecialchars($page['content'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$content = nl2br($content);

?><!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title><?php echo $title; ?></title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;max-width:800px;margin:auto}h1{font-size:24px}</style>
  </head>
  <body>
    <h1><?php echo $title; ?></h1>
    <div><?php echo $content; ?></div>
    <p style="color:#666;font-size:12px;margin-top:20px">Creado: <?php echo $page['created_at']; ?></p>
  </body>
</html>

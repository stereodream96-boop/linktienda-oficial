<?php
// backend/api/upload_category_image.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$uploadDir = __DIR__ . '/../uploads/categories';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

$host = $_SERVER['HTTP_HOST'];
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$base = $scheme . '://' . $host . '/LinkTiendas/Link%20Tienda';

$page_id = isset($_POST['page_id']) ? (int)$_POST['page_id'] : 0;
$category_name = isset($_POST['category_name']) ? trim($_POST['category_name']) : '';

if ($page_id <= 0 || $category_name === '') {
    http_response_code(400);
    echo json_encode(['ok'=>false,'message'=>'page_id y category_name requeridos']);
    exit;
}

if (!isset($_FILES['image'])) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'message'=>'Archivo de imagen no enviado']);
    exit;
}
$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'Error de upload']); exit; }

$allowed = ['image/jpeg','image/png','image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
if (!in_array($mime, $allowed)) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'Tipo de archivo no permitido']); exit; }
$max = 5 * 1024 * 1024; // 5MB
if ($file['size'] > $max) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'Archivo demasiado grande']); exit; }

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$safe = bin2hex(random_bytes(8)) . ($ext ? ".".$ext : '');
$dest = $uploadDir . DIRECTORY_SEPARATOR . $safe;
if (!move_uploaded_file($file['tmp_name'], $dest)) { http_response_code(500); echo json_encode(['ok'=>false,'message'=>'No se pudo mover archivo']); exit; }

$image_url = $base . '/backend/uploads/categories/' . $safe;

// update pages table: find category and set image_url
$hostDb = '127.0.0.1'; $db = 'link_tienda'; $user = 'root'; $pass = ''; $charset = 'utf8mb4';
$dsn = "mysql:host=$hostDb;dbname=$db;charset=$charset";
$options = [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC];
try {
    $pdo = new PDO($dsn,$user,$pass,$options);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['ok'=>false,'message'=>'DB connection failed','detail'=>$e->getMessage()]); exit;
}

try {
    $stmt = $pdo->prepare('SELECT categories FROM pages WHERE id = :id LIMIT 1');
    $stmt->execute([':id'=>$page_id]);
    $row = $stmt->fetch();
    if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'message'=>'Página no encontrada']); exit; }
    $cats = $row['categories'] ? json_decode($row['categories'], true) : [];
    // normalize to array of objects
    if (is_array($cats)) {
        if (count($cats)>0 && isset($cats[0]) && is_string($cats[0])) {
            $cats = array_map(function($n){ return ['name'=>$n, 'image_url'=>null]; }, $cats);
        } else {
            $normalized = [];
            foreach ($cats as $c) {
                if (is_string($c)) $normalized[] = ['name'=>$c,'image_url'=>null];
                else $normalized[] = ['name'=> (isset($c['name'])?$c['name']:''), 'image_url'=> (isset($c['image_url'])?$c['image_url']:null)];
            }
            $cats = $normalized;
        }
    } else { $cats = []; }

    // find category by name (case-insensitive)
    $found = false; $updatedCat = null;
    foreach ($cats as &$c) {
        if (strcasecmp(trim($c['name']), $category_name) === 0) {
            $c['image_url'] = $image_url;
            $found = true; $updatedCat = $c; break;
        }
    }
    if (!$found) { http_response_code(404); echo json_encode(['ok'=>false,'message'=>'Categoría no encontrada']); exit; }
    // save back
    $newJson = json_encode($cats);
    $up = $pdo->prepare('UPDATE pages SET categories = :cats WHERE id = :id');
    $up->execute([':cats'=>$newJson, ':id'=>$page_id]);
    echo json_encode(['ok'=>true,'category'=>$updatedCat,'categories'=>$cats]);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['ok'=>false,'message'=>'DB error','detail'=>$e->getMessage()]); exit;
}

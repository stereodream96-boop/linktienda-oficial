<?php
// backend/api/upload_service_image.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$uploadDir = __DIR__ . '/../uploads/services';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

$host = $_SERVER['HTTP_HOST'];
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$base = $scheme . '://' . $host . '/LinkTiendas/Link%20Tienda';

$service_id = isset($_POST['service_id']) ? (int)$_POST['service_id'] : 0;
if ($service_id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'service_id requerido']); exit; }

if (!isset($_FILES['image'])) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'Archivo de imagen no enviado']); exit; }
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

$image_url = $base . '/backend/uploads/services/' . $safe;

// update page_services.images_json
$hostDb = '127.0.0.1'; $db = 'link_tienda'; $user = 'root'; $pass = ''; $charset = 'utf8mb4';
$dsn = "mysql:host=$hostDb;dbname=$db;charset=$charset";
$options = [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC];
try {
    $pdo = new PDO($dsn,$user,$pass,$options);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['ok'=>false,'message'=>'DB connection failed','detail'=>$e->getMessage()]); exit;
}

try {
    $stmt = $pdo->prepare('SELECT images_json FROM page_services WHERE id = :id LIMIT 1');
    $stmt->execute([':id'=>$service_id]);
    $row = $stmt->fetch();
    if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'message'=>'Servicio no encontrado']); exit; }
    $imgs = $row['images_json'] ? json_decode($row['images_json'], true) : [];
    if (!is_array($imgs)) $imgs = [];
    $imgs[] = $image_url;
    $newJson = json_encode($imgs);
    $up = $pdo->prepare('UPDATE page_services SET images_json = :imgs WHERE id = :id');
    $up->execute([':imgs'=>$newJson, ':id'=>$service_id]);
    echo json_encode(['ok'=>true,'image_url'=>$image_url,'images_json'=>$imgs]);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['ok'=>false,'message'=>'DB error','detail'=>$e->getMessage()]); exit;
}

<?php
// backend/api/delete_service_image.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$input = $_POST;
$service_id = isset($input['service_id']) ? (int)$input['service_id'] : 0;
$image_url = isset($input['image_url']) ? trim($input['image_url']) : '';
if ($service_id <= 0 || $image_url === '') { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'service_id e image_url requeridos']); exit; }

$host = $_SERVER['HTTP_HOST'];
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$base = $scheme . '://' . $host . '/LinkTiendas/Link%20Tienda';

$uploadDir = __DIR__ . '/../uploads/services';

$hostDb = '127.0.0.1'; $db = 'link_tienda'; $user = 'root'; $pass = ''; $charset = 'utf8mb4';
$dsn = "mysql:host=$hostDb;dbname=$db;charset=$charset";
$options = [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC];
try { $pdo = new PDO($dsn,$user,$pass,$options); } catch (PDOException $e) { http_response_code(500); echo json_encode(['ok'=>false,'message'=>'DB connection failed','detail'=>$e->getMessage()]); exit; }

try {
    $stmt = $pdo->prepare('SELECT images_json FROM page_services WHERE id = :id LIMIT 1');
    $stmt->execute([':id'=>$service_id]);
    $row = $stmt->fetch();
    if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'message'=>'Servicio no encontrado']); exit; }
    $imgs = $row['images_json'] ? json_decode($row['images_json'], true) : [];
    if (!is_array($imgs)) $imgs = [];

    // Find image (full match)
    $foundIndex = null;
    foreach ($imgs as $i => $u) {
        if (trim($u) === $image_url) { $foundIndex = $i; break; }
    }
    if ($foundIndex === null) { http_response_code(404); echo json_encode(['ok'=>false,'message'=>'Imagen no encontrada en servicio']); exit; }

    // remove from array
    $removed = $imgs[$foundIndex];
    array_splice($imgs, $foundIndex, 1);
    $newJson = json_encode($imgs);
    $up = $pdo->prepare('UPDATE page_services SET images_json = :imgs WHERE id = :id');
    $up->execute([':imgs'=>$newJson, ':id'=>$service_id]);

    // try to delete file from disk if under uploads/services
    $parsed = parse_url($removed);
    $path = isset($parsed['path']) ? $parsed['path'] : '';
    $basePath = '/LinkTiendas/Link%20Tienda/backend/uploads/services/';
    if (strpos($path, '/backend/uploads/services/') !== false) {
        $filename = basename($path);
        $filePath = __DIR__ . '/../uploads/services/' . $filename;
        if (is_file($filePath)) { @unlink($filePath); }
    }

    echo json_encode(['ok'=>true,'removed'=>$removed,'images_json'=>$imgs]);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['ok'=>false,'message'=>'DB error','detail'=>$e->getMessage()]); exit;
}

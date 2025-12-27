<?php
// backend/api/upload_logo.php
// Subida de logo para una página: multipart/form-data (page_id, logo)
ini_set('display_errors', '1'); ini_set('display_startup_errors', '1'); error_reporting(E_ALL);
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$host = '127.0.0.1';
$db   = 'link_tienda';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$opts = [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC];

try { $pdo = new PDO($dsn, $user, $pass, $opts); } catch (PDOException $e) { http_response_code(500); echo json_encode(['ok'=>false,'message'=>'DB connection failed','detail'=>$e->getMessage()]); exit; }

// Validate page_id
$page_id = isset($_POST['page_id']) ? (int)$_POST['page_id'] : 0;
if ($page_id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'page_id requerido']); exit; }

if (!isset($_FILES['logo'])) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'Archivo logo no recibido']); exit; }
$f = $_FILES['logo'];
if ($f['error'] !== UPLOAD_ERR_OK) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'Error en la subida','code'=>$f['error']]); exit; }

$allowed = ['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $f['tmp_name']);
finfo_close($finfo);
if (!isset($allowed[$mime])) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'MIME no permitido']); exit; }

if ($f['size'] > 2 * 1024 * 1024) { http_response_code(400); echo json_encode(['ok'=>false,'message'=>'Archivo > 2MB']); exit; }

$ext = $allowed[$mime];
$uploadsDir = __DIR__ . '/../uploads/logos';
if (!is_dir($uploadsDir)) { @mkdir($uploadsDir, 0755, true); }
$timestamp = time();
$filename = sprintf('logo_%d_%d.%s', $page_id, $timestamp, $ext);
$destPath = $uploadsDir . '/' . $filename;

if (!move_uploaded_file($f['tmp_name'], $destPath)) { http_response_code(500); echo json_encode(['ok'=>false,'message'=>'No se pudo mover el archivo']); exit; }

$publicPath = '/backend/uploads/logos/' . $filename;

// Update pages.logo_url
try {
    $stmt = $pdo->prepare('UPDATE pages SET logo_url = :logo WHERE id = :id');
    $stmt->execute([':logo'=>$publicPath, ':id'=>$page_id]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'message'=>'No se pudo actualizar la página','detail'=>$e->getMessage()]);
    exit;
}

echo json_encode(['ok'=>true,'logo_url'=>$publicPath]);
exit;

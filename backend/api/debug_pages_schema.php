<?php
// backend/api/debug_pages_schema.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$host = '127.0.0.1';
$db   = 'link_tienda';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'DB connection failed','detail'=>$e->getMessage()]);
    exit;
}

try {
    $cols = [];
    $stmt = $pdo->query("DESCRIBE pages");
    $cols = $stmt->fetchAll();
    $row = null;
    try {
        $s2 = $pdo->query("SELECT * FROM pages LIMIT 1");
        $row = $s2->fetch();
    } catch (Exception $e) { $row = null; }
    echo json_encode(['ok'=>true,'columns'=>$cols,'sample'=>$row]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Query failed','detail'=>$e->getMessage()]);
}

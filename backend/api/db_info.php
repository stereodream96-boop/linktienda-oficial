<?php
// backend/api/db_info.php
// Endpoint de diagnóstico: prueba conexión a la DB y lista columnas de la tabla `pages`.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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

$out = ['ok' => false, 'time' => date('c')];
try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $out['ok'] = true;
    $out['msg'] = 'Connected';

    // listar columnas
    $stmt = $pdo->prepare("SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'pages'");
    $stmt->execute([':db' => $db]);
    $cols = $stmt->fetchAll();
    $out['columns'] = $cols;

    // contar filas
    try {
        $cnt = $pdo->query('SELECT COUNT(*) AS c FROM pages')->fetch()['c'];
        $out['pages_count'] = (int)$cnt;
    } catch (Exception $e) {
        $out['pages_count_error'] = $e->getMessage();
    }
} catch (PDOException $e) {
    http_response_code(500);
    $out['error'] = $e->getMessage();
}

echo json_encode($out, JSON_PRETTY_PRINT);

<?php
// backend/api/config.php
// Recupera y actualiza configuraciones simples almacenadas en la tabla `settings`.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$host = '127.0.0.1';
$db   = 'link_tienda';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];

try { $pdo = new PDO($dsn, $user, $pass, $options); }
catch (PDOException $e) { http_response_code(500); echo json_encode(['error'=>'DB connection failed','detail'=>$e->getMessage()]); exit; }

// Ensure settings table
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `settings` (
        `k` VARCHAR(191) NOT NULL PRIMARY KEY,
        `v` TEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) { }

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['key'])) {
            $stmt = $pdo->prepare('SELECT v FROM settings WHERE k = :k');
            $stmt->execute([':k' => $_GET['key']]);
            $r = $stmt->fetch();
            if (!$r) { http_response_code(404); echo json_encode(['error'=>'Not found']); exit; }
            echo json_encode(['key'=>$_GET['key'],'value'=>$r['v']]); exit;
        }
        $stmt = $pdo->query('SELECT k,v FROM settings');
        $all = $stmt->fetchAll();
        $out = [];
        foreach ($all as $row) $out[$row['k']] = $row['v'];
        echo json_encode(['settings' => $out]); exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Expect { key: 'site_name', value: 'My Store' }
        $key = isset($input['key']) ? trim($input['key']) : '';
        $value = isset($input['value']) ? $input['value'] : null;
        if ($key === '') { http_response_code(400); echo json_encode(['error'=>'key required']); exit; }
        $stmt = $pdo->prepare('INSERT INTO settings (k,v) VALUES (:k,:v) ON DUPLICATE KEY UPDATE v = :v2');
        $stmt->execute([':k'=>$key, ':v'=>$value, ':v2'=>$value]);
        echo json_encode(['ok'=>true,'key'=>$key,'value'=>$value]); exit;
    }

    http_response_code(405); echo json_encode(['error'=>'Method not allowed']);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['error'=>'Query failed','detail'=>$e->getMessage()]);
}

exit;

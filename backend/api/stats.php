<?php
// backend/api/stats.php
// Devuelve estadísticas básicas: conteos y valor total de inventario.
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

try { $pdo = new PDO($dsn, $user, $pass, $options); }
catch (PDOException $e) { http_response_code(500); echo json_encode(['error'=>'DB connection failed','detail'=>$e->getMessage()]); exit; }

try {
    // Pages count
    $pagesCnt = 0;
    try { $pagesCnt = (int)$pdo->query('SELECT COUNT(*) AS c FROM pages')->fetch()['c']; } catch (Exception $e) { $pagesCnt = 0; }

    // Products count and total value
    $productsCnt = 0;
    $totalValue = 0.0;
    try {
        $r = $pdo->query('SELECT COUNT(*) AS c, COALESCE(SUM(price),0) AS total FROM products')->fetch();
        $productsCnt = (int)$r['c'];
        $totalValue = (float)$r['total'];
    } catch (Exception $e) { }

    // Recent pages (simple)
    $recentPages = [];
    try {
        $stmt = $pdo->query('SELECT id,title,slug,created_at FROM pages ORDER BY created_at DESC LIMIT 5');
        $recentPages = $stmt->fetchAll();
    } catch (Exception $e) { }

    echo json_encode([
        'ok' => true,
        'pages_count' => $pagesCnt,
        'products_count' => $productsCnt,
        'inventory_total_value' => $totalValue,
        'recent_pages' => $recentPages,
        'generated_at' => date('c'),
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Failed to build stats','detail'=>$e->getMessage()]);
}

exit;

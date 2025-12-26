<?php
// backend/api/edit-page.php
// Actualiza una página existente por `id` o `slug`.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

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
    echo json_encode(['error' => 'DB connection failed', 'detail' => $e->getMessage()]);
    exit;
}

// Ensure pages table exists (compatible with pages.php)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `pages` (
        `id` INT NOT NULL AUTO_INCREMENT,
        `title` VARCHAR(255) NOT NULL,
        `content` TEXT NOT NULL,
        `promo_message` TEXT NULL,
        `images` TEXT NULL,
        `categories` TEXT NULL,
        `section_type` VARCHAR(100) NULL,
        `contact_info` TEXT NULL,
        `slug` VARCHAR(255) NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) {
    // ignore creation error
}

if (!in_array($method, ['POST', 'PUT'])) {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$id = isset($input['id']) ? (int)$input['id'] : 0;
$slug = isset($input['slug']) ? trim($input['slug']) : null;

if ($id <= 0 && !$slug) {
    http_response_code(400);
    echo json_encode(['error' => 'Provide id or slug to update']);
    exit;
}

$fields = [];
$params = [];

// Allowed fields to update
$allowed = ['title','content','promo_message','images','categories','section_type','contact_info','slug'];
foreach ($allowed as $f) {
    if (array_key_exists($f, $input)) {
        if (in_array($f, ['images','categories','contact_info'])) {
            $fields[] = "`$f` = :$f";
            $params[":$f"] = json_encode($input[$f]);
        } else {
            $fields[] = "`$f` = :$f";
            $params[":$f"] = $input[$f];
        }
    }
}

if (empty($fields)) {
    http_response_code(400);
    echo json_encode(['error' => 'No updatable fields provided']);
    exit;
}

try {
    if ($id > 0) {
        $params[':id'] = $id;
        $sql = 'UPDATE pages SET ' . implode(', ', $fields) . ' WHERE id = :id';
    } else {
        $params[':slug_where'] = $slug;
        $sql = 'UPDATE pages SET ' . implode(', ', $fields) . ' WHERE slug = :slug_where';
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['ok' => true, 'rows' => $stmt->rowCount()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Update failed', 'detail' => $e->getMessage()]);
}

exit;

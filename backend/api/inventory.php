<?php
// backend/api/inventory.php
// CRUD básico para la tabla `products`.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$method = $_SERVER['REQUEST_METHOD'];
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

// Ensure products table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `products` (
        `id` INT NOT NULL AUTO_INCREMENT,
        `name` VARCHAR(255) NOT NULL,
        `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) { }

try {
    if ($method === 'GET') {
        // list or single by id
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT id,name,price FROM products WHERE id = :id');
            $stmt->execute([':id' => (int)$_GET['id']]);
            $p = $stmt->fetch();
            if (!$p) { http_response_code(404); echo json_encode(['error'=>'Not found']); exit; }
            echo json_encode(['product'=>$p]);
            exit;
        }
        $stmt = $pdo->query('SELECT id,name,price FROM products ORDER BY id DESC');
        $rows = $stmt->fetchAll();
        echo json_encode(['products' => $rows]);
        exit;
    }

    if ($method === 'POST') {
        $name = isset($input['name']) ? trim($input['name']) : '';
        $price = isset($input['price']) ? (float)$input['price'] : 0.0;
        if ($name === '') { http_response_code(400); echo json_encode(['error'=>'Name required']); exit; }
        $stmt = $pdo->prepare('INSERT INTO products (name,price) VALUES (:name,:price)');
        $stmt->execute([':name'=>$name, ':price'=>$price]);
        echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId()]);
        exit;
    }

    if ($method === 'PUT') {
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        if ($id <= 0) { http_response_code(400); echo json_encode(['error'=>'id required']); exit; }
        $sets = [];
        $params = [':id'=>$id];
        if (isset($input['name'])) { $sets[] = 'name = :name'; $params[':name'] = $input['name']; }
        if (isset($input['price'])) { $sets[] = 'price = :price'; $params[':price'] = (float)$input['price']; }
        if (empty($sets)) { http_response_code(400); echo json_encode(['error'=>'No fields to update']); exit; }
        $sql = 'UPDATE products SET '.implode(', ',$sets).' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['ok'=>true,'rows'=>$stmt->rowCount()]); exit;
    }

    if ($method === 'DELETE') {
        // id via query or body
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error'=>'id required']); exit; }
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = :id');
        $stmt->execute([':id'=>$id]);
        echo json_encode(['ok'=>true,'rows'=>$stmt->rowCount()]); exit;
    }

    http_response_code(405);
    echo json_encode(['error'=>'Method not allowed']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Query failed','detail'=>$e->getMessage()]);
}

exit;

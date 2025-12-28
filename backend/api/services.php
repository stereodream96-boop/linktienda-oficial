<?php
// backend/api/services.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
try { $pdo = new PDO($dsn, $user, $pass, $options); } catch (PDOException $e) { http_response_code(500); echo json_encode(['error'=>'DB connection failed','detail'=>$e->getMessage()]); exit; }

// Ensure page_services table exists (include optional fields)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `page_services` (
        `id` INT NOT NULL AUTO_INCREMENT,
        `page_id` INT NOT NULL,
        `description` TEXT NULL,
        `images_json` TEXT NULL,
        `name` VARCHAR(255) NOT NULL,
        `price` DECIMAL(10,2) DEFAULT 0,
        `duration_minutes` INT NOT NULL,
        `category` VARCHAR(100) NULL,
        `active` TINYINT DEFAULT 1,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        INDEX (`page_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) { }
// Try to add category/description/images_json columns if missing (safe: ignore errors)
try { $pdo->exec("ALTER TABLE page_services ADD COLUMN category VARCHAR(100) NULL"); } catch (PDOException $e) { }
try { $pdo->exec("ALTER TABLE page_services ADD COLUMN description TEXT NULL"); } catch (PDOException $e) { }
try { $pdo->exec("ALTER TABLE page_services ADD COLUMN images_json TEXT NULL"); } catch (PDOException $e) { }

function ensure_service_page($pdo, $page_id) {
    $stmt = $pdo->prepare('SELECT page_type FROM pages WHERE id = :id');
    $stmt->execute([':id' => $page_id]);
    $p = $stmt->fetch();
    if (!$p) return ['ok'=>false,'message'=>'Página no encontrada'];
    if (!isset($p['page_type']) || strtolower($p['page_type']) !== strtolower('Servicio')) return ['ok'=>false,'message'=>'Esta página no es de tipo Servicio'];
    return ['ok'=>true];
}

try {
    if ($method === 'GET') {
        // Support fetching single service by id: ?action=get&id=...
        if (isset($_GET['action']) && $_GET['action'] === 'get' && isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            if ($id <= 0) { echo json_encode(['ok'=>false,'message'=>'id requerido']); exit; }
            $stmt = $pdo->prepare('SELECT id,page_id,name,price,duration_minutes,category,active,description,images_json,created_at FROM page_services WHERE id = :id LIMIT 1');
            $stmt->execute([':id'=>$id]);
            $row = $stmt->fetch();
            if (!$row) { echo json_encode(['ok'=>false,'message'=>'Servicio no encontrado']); exit; }
            // optional: ensure page is Servicio type
            $stmt2 = $pdo->prepare('SELECT page_type FROM pages WHERE id = :id'); $stmt2->execute([':id'=>$row['page_id']]); $p = $stmt2->fetch();
            if (!$p) { echo json_encode(['ok'=>false,'message'=>'Página asociada no encontrada']); exit; }
            $row['description'] = isset($row['description']) ? $row['description'] : '';
            $row['images_json'] = $row['images_json'] ? json_decode($row['images_json'], true) : [];
            echo json_encode(['ok'=>true,'service'=>$row]); exit;
        }

        $page_id = isset($_GET['page_id']) ? (int)$_GET['page_id'] : 0;
        if ($page_id <= 0) { echo json_encode(['ok'=>false,'message'=>'page_id requerido']); exit; }
        $chk = ensure_service_page($pdo, $page_id);
        if (!$chk['ok']) { echo json_encode($chk); exit; }
        $stmt = $pdo->prepare('SELECT id,page_id,name,price,duration_minutes,category,active,description,images_json,created_at FROM page_services WHERE page_id = :pid ORDER BY id DESC');
        $stmt->execute([':pid'=>$page_id]);
        $rows = $stmt->fetchAll();
        // decode images_json for each row
        foreach ($rows as &$r) { $r['images_json'] = $r['images_json'] ? json_decode($r['images_json'], true) : []; }
        echo json_encode(['ok'=>true,'services'=>$rows]); exit;
    }

    if ($method === 'POST') {
        $action = isset($_GET['action']) ? $_GET['action'] : (isset($input['action']) ? $input['action'] : null);
        if ($action === 'create') {
            $page_id = isset($input['page_id']) ? (int)$input['page_id'] : 0;
            $name = isset($input['name']) ? trim($input['name']) : '';
            $price = isset($input['price']) ? (float)$input['price'] : 0.0;
            $duration = isset($input['duration_minutes']) ? (int)$input['duration_minutes'] : 0;
            $active = isset($input['active']) ? (int)$input['active'] : 1;
            if ($page_id <= 0 || $name === '' || $duration <= 0) { echo json_encode(['ok'=>false,'message'=>'page_id, name y duration_minutes requeridos']); exit; }
            $chk = ensure_service_page($pdo, $page_id);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            $category = isset($input['category']) ? (trim($input['category']) === '' ? null : trim($input['category'])) : null;
            $description = isset($input['description']) ? trim($input['description']) : null;
            $images_json = isset($input['images_json']) ? json_encode($input['images_json']) : null;
            $stmt = $pdo->prepare('INSERT INTO page_services (page_id,name,price,duration_minutes,category,active,description,images_json) VALUES (:page_id,:name,:price,:duration,:category,:active,:description,:images)');
            $stmt->execute([':page_id'=>$page_id,':name'=>$name,':price'=>$price,':duration'=>$duration,':category'=>$category,':active'=>$active,':description'=>$description,':images'=>$images_json]);
            echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId(),'received'=> $input]); exit;
        }

        if ($action === 'update') {
            $id = isset($input['id']) ? (int)$input['id'] : 0;
            if ($id <= 0) { echo json_encode(['ok'=>false,'message'=>'id requerido']); exit; }
            $stmt = $pdo->prepare('SELECT * FROM page_services WHERE id = :id');
            $stmt->execute([':id'=>$id]);
            $row = $stmt->fetch();
            if (!$row) { echo json_encode(['ok'=>false,'message'=>'Servicio no encontrado']); exit; }
            $chk = ensure_service_page($pdo, $row['page_id']);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            $fields = [];
            $params = [':id'=>$id];
            if (array_key_exists('name',$input) && trim($input['name']) !== '') { $fields[] = 'name = :name'; $params[':name'] = trim($input['name']); }
            if (array_key_exists('price',$input)) { $fields[] = 'price = :price'; $params[':price'] = (float)$input['price']; }
            if (array_key_exists('duration_minutes',$input)) { $fields[] = 'duration_minutes = :duration'; $params[':duration'] = (int)$input['duration_minutes']; }
            if (array_key_exists('category',$input)) { $fields[] = 'category = :category'; $params[':category'] = strlen(trim($input['category'])) ? trim($input['category']) : null; }
            if (array_key_exists('description',$input)) { $fields[] = 'description = :description'; $params[':description'] = trim($input['description']); }
            if (array_key_exists('images_json',$input)) { $fields[] = 'images_json = :images_json'; $params[':images_json'] = is_array($input['images_json']) ? json_encode($input['images_json']) : $input['images_json']; }
            if (array_key_exists('active',$input)) { $fields[] = 'active = :active'; $params[':active'] = (int)$input['active']; }
            if (empty($fields)) { echo json_encode(['ok'=>false,'message'=>'No hay cambios para aplicar']); exit; }
            $sql = 'UPDATE page_services SET '.implode(', ',$fields).' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['ok'=>true,'rows'=>$stmt->rowCount()]); exit;
        }

        if ($action === 'delete') {
            $id = isset($input['id']) ? (int)$input['id'] : 0;
            if ($id <= 0) { echo json_encode(['ok'=>false,'message'=>'id requerido']); exit; }
            $stmt = $pdo->prepare('SELECT page_id FROM page_services WHERE id = :id');
            $stmt->execute([':id'=>$id]);
            $r = $stmt->fetch();
            if (!$r) { echo json_encode(['ok'=>false,'message'=>'Servicio no encontrado']); exit; }
            $chk = ensure_service_page($pdo, $r['page_id']);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            $stmt = $pdo->prepare('DELETE FROM page_services WHERE id = :id');
            $stmt->execute([':id'=>$id]);
            echo json_encode(['ok'=>true,'rows'=>$stmt->rowCount()]); exit;
        }

        echo json_encode(['ok'=>false,'message'=>'Action no soportada']); exit;
    }

    http_response_code(405); echo json_encode(['error'=>'Method not allowed']);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['error'=>'Query failed','detail'=>$e->getMessage()]);
}

exit;

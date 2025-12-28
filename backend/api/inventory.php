<?php
// backend/api/inventory.php
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

// Ensure page_products table exists (with filters fields)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `page_products` (
        `id` INT NOT NULL AUTO_INCREMENT,
        `page_id` INT NOT NULL,
        `name` VARCHAR(255) NOT NULL,
        `price` DECIMAL(10,2) DEFAULT 0,
        `stock` INT DEFAULT 0,
        `sku` VARCHAR(100) NULL,
        `category` VARCHAR(100) NULL,
        `description` TEXT NULL,
        `image_url` TEXT NULL,
        `images_json` TEXT NULL,
        `on_sale` TINYINT DEFAULT 0,
        `sale_price` DECIMAL(10,2) NULL,
        `featured` TINYINT DEFAULT 0,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        INDEX (`page_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) { }
// Try to add new columns if missing (safe: ignore errors)
try {
    $pdo->exec("ALTER TABLE page_products ADD COLUMN category VARCHAR(100) NULL");
} catch (PDOException $e) { }
try {
    $pdo->exec("ALTER TABLE page_products ADD COLUMN on_sale TINYINT DEFAULT 0");
} catch (PDOException $e) { }
try {
    $pdo->exec("ALTER TABLE page_products ADD COLUMN sale_price DECIMAL(10,2) NULL");
} catch (PDOException $e) { }
try {
    $pdo->exec("ALTER TABLE page_products ADD COLUMN featured TINYINT DEFAULT 0");
} catch (PDOException $e) { }
try {
    $pdo->exec("ALTER TABLE page_products ADD COLUMN description TEXT NULL");
} catch (PDOException $e) { }
try {
    $pdo->exec("ALTER TABLE page_products ADD COLUMN image_url TEXT NULL");
} catch (PDOException $e) { }
try {
    $pdo->exec("ALTER TABLE page_products ADD COLUMN images_json TEXT NULL");
} catch (PDOException $e) { }

function ensure_product_page($pdo, $page_id) {
    $stmt = $pdo->prepare('SELECT page_type FROM pages WHERE id = :id');
    $stmt->execute([':id' => $page_id]);
    $p = $stmt->fetch();
    if (!$p) return ['ok'=>false,'message'=>'Página no encontrada'];
    if (!isset($p['page_type']) || strtolower($p['page_type']) !== strtolower('Producto')) return ['ok'=>false,'message'=>'Esta página no es de tipo Producto'];
    return ['ok'=>true];
}

try {
    if ($method === 'GET') {
        // Support fetching single product by id: ?action=get&id=...
        if (isset($_GET['action']) && $_GET['action'] === 'get' && isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            if ($id <= 0) { echo json_encode(['ok'=>false,'message'=>'id requerido']); exit; }
            $stmt = $pdo->prepare('SELECT id,page_id,name,price,stock,sku,category,description,image_url,images_json,on_sale,sale_price,featured,created_at FROM page_products WHERE id = :id LIMIT 1');
            $stmt->execute([':id'=>$id]);
            $row = $stmt->fetch();
            if (!$row) { echo json_encode(['ok'=>false,'message'=>'Producto no encontrado']); exit; }
            // optional: ensure page is Producto type
            $stmt2 = $pdo->prepare('SELECT page_type FROM pages WHERE id = :id'); $stmt2->execute([':id'=>$row['page_id']]); $p = $stmt2->fetch();
            if (!$p) { echo json_encode(['ok'=>false,'message'=>'Página asociada no encontrada']); exit; }
            // return row and placeholders
            $row['description'] = isset($row['description']) ? $row['description'] : '';
            $row['image_url'] = isset($row['image_url']) ? $row['image_url'] : null;
            $row['images_json'] = isset($row['images_json']) && $row['images_json'] ? (is_string($row['images_json']) ? json_decode($row['images_json'], true) : $row['images_json']) : [];
            echo json_encode(['ok'=>true,'product'=>$row]); exit;
        }

        $page_id = isset($_GET['page_id']) ? (int)$_GET['page_id'] : 0;
        if ($page_id <= 0) { echo json_encode(['ok'=>false,'message'=>'page_id requerido']); exit; }
        $chk = ensure_product_page($pdo, $page_id);
        if (!$chk['ok']) { echo json_encode($chk); exit; }
        $filter = isset($_GET['filter']) ? $_GET['filter'] : null;
        $sql = 'SELECT id,page_id,name,price,stock,sku,category,image_url,images_json,on_sale,sale_price,featured,created_at FROM page_products WHERE page_id = :pid';
        $params = [':pid'=>$page_id];
        if ($filter === 'offers') {
            $sql .= ' AND on_sale = 1';
        } elseif ($filter === 'featured') {
            $sql .= ' AND featured = 1';
        } elseif ($filter === 'category' && isset($_GET['category'])) {
            $sql .= ' AND category = :cat';
            $params[':cat'] = $_GET['category'];
        }
        $sql .= ' ORDER BY id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        echo json_encode(['ok'=>true,'products'=>$rows]); exit;
    }

    if ($method === 'POST') {
        $action = isset($_GET['action']) ? $_GET['action'] : (isset($input['action']) ? $input['action'] : null);
        if ($action === 'create') {
            $page_id = isset($input['page_id']) ? (int)$input['page_id'] : 0;
            $name = isset($input['name']) ? trim($input['name']) : '';
            $description = isset($input['description']) ? trim($input['description']) : null;
            $image_url = isset($input['image_url']) ? $input['image_url'] : null;
            $images_json = isset($input['images_json']) ? $input['images_json'] : null;
            $price = isset($input['price']) ? (float)$input['price'] : 0.0;
            $stock = isset($input['stock']) ? (int)$input['stock'] : 0;
            $sku = isset($input['sku']) ? trim($input['sku']) : null;
            $category = isset($input['category']) ? trim($input['category']) : null;
            $on_sale = isset($input['on_sale']) ? (int)$input['on_sale'] : 0;
            $sale_price = isset($input['sale_price']) ? (float)$input['sale_price'] : null;
            $featured = isset($input['featured']) ? (int)$input['featured'] : 0;
            if ($page_id <= 0 || $name === '') { echo json_encode(['ok'=>false,'message'=>'page_id y name requeridos']); exit; }
            $chk = ensure_product_page($pdo, $page_id);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            $stmt = $pdo->prepare('INSERT INTO page_products (page_id,name,price,stock,sku,category,description,image_url,images_json,on_sale,sale_price,featured) VALUES (:page_id,:name,:price,:stock,:sku,:category,:description,:image_url,:images_json,:on_sale,:sale_price,:featured)');
            $stmt->execute([':page_id'=>$page_id,':name'=>$name,':price'=>$price,':stock'=>$stock,':sku'=>$sku,':category'=>$category,':description'=>$description,':image_url'=>$image_url,':images_json'=>(is_array($images_json)?json_encode($images_json):($images_json===null?null:$images_json)),':on_sale'=>$on_sale,':sale_price'=>$sale_price,':featured'=>$featured]);
            // Dev: devolver payload recibido para diagnóstico (remover en producción)
            echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId(),'received'=>$input]); exit;
        }

        if ($action === 'update') {
            $id = isset($input['id']) ? (int)$input['id'] : 0;
            if ($id <= 0) { echo json_encode(['ok'=>false,'message'=>'id requerido']); exit; }
            $stmt = $pdo->prepare('SELECT * FROM page_products WHERE id = :id');
            $stmt->execute([':id'=>$id]);
            $row = $stmt->fetch();
            if (!$row) { echo json_encode(['ok'=>false,'message'=>'Producto no encontrado']); exit; }
            $chk = ensure_product_page($pdo, $row['page_id']);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            $fields = [];
            $params = [':id'=>$id];
            if (array_key_exists('name',$input) && trim($input['name']) !== '') { $fields[] = 'name = :name'; $params[':name'] = trim($input['name']); }
            if (array_key_exists('price',$input)) { $fields[] = 'price = :price'; $params[':price'] = (float)$input['price']; }
            if (array_key_exists('stock',$input)) { $fields[] = 'stock = :stock'; $params[':stock'] = (int)$input['stock']; }
            if (array_key_exists('sku',$input)) { $fields[] = 'sku = :sku'; $params[':sku'] = strlen(trim($input['sku'])) ? trim($input['sku']) : null; }
            if (array_key_exists('category',$input)) { $fields[] = 'category = :category'; $params[':category'] = strlen(trim($input['category'])) ? trim($input['category']) : null; }
            if (array_key_exists('description',$input)) { $fields[] = 'description = :description'; $params[':description'] = trim($input['description']) !== '' ? trim($input['description']) : null; }
            if (array_key_exists('image_url',$input)) { $fields[] = 'image_url = :image_url'; $params[':image_url'] = strlen(trim($input['image_url'])) ? $input['image_url'] : null; }
            if (array_key_exists('images_json',$input)) { $fields[] = 'images_json = :images_json'; $params[':images_json'] = is_array($input['images_json']) ? json_encode($input['images_json']) : (is_string($input['images_json']) ? $input['images_json'] : null); }
            if (array_key_exists('on_sale',$input)) { $fields[] = 'on_sale = :on_sale'; $params[':on_sale'] = (int)$input['on_sale']; }
            if (array_key_exists('sale_price',$input)) { $fields[] = 'sale_price = :sale_price'; $params[':sale_price'] = (float)$input['sale_price']; }
            if (array_key_exists('featured',$input)) { $fields[] = 'featured = :featured'; $params[':featured'] = (int)$input['featured']; }
            if (empty($fields)) { echo json_encode(['ok'=>false,'message'=>'No hay cambios para aplicar']); exit; }
            $sql = 'UPDATE page_products SET '.implode(', ',$fields).' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            // Dev: devolver payload recibido y parámetros ejecutados para diagnóstico
            echo json_encode(['ok'=>true,'rows'=>$stmt->rowCount(),'received'=>$input,'params'=>$params]); exit;
        }

        if ($action === 'delete') {
            $id = isset($input['id']) ? (int)$input['id'] : 0;
            if ($id <= 0) { echo json_encode(['ok'=>false,'message'=>'id requerido']); exit; }
            $stmt = $pdo->prepare('SELECT page_id FROM page_products WHERE id = :id');
            $stmt->execute([':id'=>$id]);
            $r = $stmt->fetch();
            if (!$r) { echo json_encode(['ok'=>false,'message'=>'Producto no encontrado']); exit; }
            $chk = ensure_product_page($pdo, $r['page_id']);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            $stmt = $pdo->prepare('DELETE FROM page_products WHERE id = :id');
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

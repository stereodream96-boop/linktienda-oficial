<?php
// backend/api/pages.php
// API de administración (JSON) — este endpoint gestiona la creación/listado
// de páginas desde el panel de administración. No debe renderizar HTML ni
// mezclar lógica de presentación pública. La vista pública se sirve desde
// `backend/page.php` (HTML) y desde el frontend público que consume aquí.
// HABILITAR DEPURACIÓN TEMPORAL: mostrar errores y devolver JSON con detalles
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
set_exception_handler(function($e){
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Uncaught exception', 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    exit;
});
set_error_handler(function($errno, $errstr, $errfile, $errline){
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

// CORS: permitir requests desde el dev server y otros orígenes (ajustar según necesidad)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
// Responder preflight OPTIONS inmediatamente para cumplir CORS
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}
// Configuración de conexión
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

// Conexión y creación de base/tablas si es necesario
try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    if ($e->getCode() == 1049) {
        try {
            $dsnNoDb = "mysql:host=$host;charset=$charset";
            $pdoNoDb = new PDO($dsnNoDb, $user, $pass, $options);
            $pdoNoDb->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdoNoDb->exec("USE `$db`");
            $pdoNoDb->exec("CREATE TABLE IF NOT EXISTS `pages` (
                `id` INT NOT NULL AUTO_INCREMENT,
                `title` VARCHAR(255) NOT NULL,
                `content` TEXT NOT NULL,
                `promo_message` TEXT NULL,
                `images` TEXT NULL,
                `categories` TEXT NULL,
                `section_type` VARCHAR(100) NULL,
                `page_type` VARCHAR(50) NULL,
                `open_time` TIME NULL,
                `close_time` TIME NULL,
                `sections_json` TEXT NULL,
                `logo_url` TEXT NULL,
                `contact_info` TEXT NULL,
                `slug` VARCHAR(255) NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
            $pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e2) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create database/table', 'detail' => $e2->getMessage()]);
            exit;
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed', 'detail' => $e->getMessage()]);
        exit;
    }
}

// Asegurar que la tabla `pages` exista (evita SQLSTATE[42S02])
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `pages` (
        `id` INT NOT NULL AUTO_INCREMENT,
        `title` VARCHAR(255) NOT NULL,
        `content` TEXT NOT NULL,
        `promo_message` TEXT NULL,
        `images` TEXT NULL,
        `categories` TEXT NULL,
        `section_type` VARCHAR(100) NULL,
        `page_type` VARCHAR(50) NULL,
        `open_time` TIME NULL,
        `close_time` TIME NULL,
        `sections_json` TEXT NULL,
        `logo_url` TEXT NULL,
        `contact_info` TEXT NULL,
        `slug` VARCHAR(255) NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) {
    // Si falla al crear la tabla, continuar y dejar que las consultas posteriores reporten el error
}

// Asegurar que la columna `slug` exista y tenga índice único
try {
    $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'slug'");
    $stmt->execute([':db' => $db]);
    $has = (int)$stmt->fetch()['c'];
    if ($has === 0) {
        // agregar columna y índice único
        $pdo->exec("ALTER TABLE `pages` ADD COLUMN `slug` VARCHAR(255) NULL AFTER `contact_info`");
            // intentar agregar page_type, open_time y close_time si no existen
            try {
                $pdo->exec("ALTER TABLE `pages` ADD COLUMN `page_type` VARCHAR(50) NULL AFTER `section_type`");
            } catch (PDOException $e2) {
            }
            try {
                $pdo->exec("ALTER TABLE `pages` ADD COLUMN `open_time` TIME NULL AFTER `page_type`");
            } catch (PDOException $e3) {
            }
            try {
                $pdo->exec("ALTER TABLE `pages` ADD COLUMN `close_time` TIME NULL AFTER `open_time`");
            } catch (PDOException $e4) {
            }
            try {
                $pdo->exec("ALTER TABLE `pages` ADD COLUMN `sections_json` TEXT NULL AFTER `close_time`");
            } catch (PDOException $e5) {
            }
            try {
                $pdo->exec("ALTER TABLE `pages` ADD COLUMN `logo_url` TEXT NULL AFTER `sections_json`");
            } catch (PDOException $e6) {
            }
        // Crear índice único si no existe
        try {
            $pdo->exec("ALTER TABLE `pages` ADD UNIQUE INDEX `idx_pages_slug` (`slug`(255))");
        } catch (PDOException $idxEx) {
            // índice puede fallar si ya existe; ignorar
        }
    }
} catch (PDOException $e) {
    // ignorar errores de verificación/alter
}

if ($method === 'POST') {
    // Soporta también actualización parcial vía ?action=update
    $action = isset($_GET['action']) ? $_GET['action'] : null;
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);

    if ($action === 'update') {
        // Modificación parcial: solo actualizar campos enviados (no vacíos)
        if (!is_array($input)) $input = [];

        $id = isset($input['id']) ? (int)$input['id'] : 0;
        if ($id <= 0) {
            echo json_encode(['ok' => false, 'message' => 'ID de página no enviado']);
            exit;
        }

        // Verificar existencia
        try {
            $check = $pdo->prepare('SELECT COUNT(*) AS c FROM pages WHERE id = :id');
            $check->execute([':id' => $id]);
            $exists = (int)$check->fetch()['c'] > 0;
            if (!$exists) {
                echo json_encode(['ok' => false, 'message' => 'Página no encontrada']);
                exit;
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Error al verificar página', 'detail' => $e->getMessage()]);
            exit;
        }

        // Helper: considerar vacío si null, empty string, empty array
        $is_empty = function ($v) {
            if ($v === null) return true;
            if (is_string($v) && trim($v) === '') return true;
            if (is_array($v) && count($v) === 0) return true;
            return false;
        };

        // Campos permitidos para actualizar
        $allowed = ['title','content','promo_message','images','categories','section_type','page_type','open_time','close_time','sections_json','logo_url','contact_info','slug'];

        // Filtrar payload: quitar id y campos vacíos
        $updates = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $input) && !$is_empty($input[$f])) {
                $updates[$f] = $input[$f];
            }
        }

        if (empty($updates)) {
            echo json_encode(['ok' => false, 'message' => 'No hay cambios para aplicar']);
            exit;
        }

        // Si vienen ambos horarios, validar lógica: open_time < close_time
        if (array_key_exists('open_time', $updates) && array_key_exists('close_time', $updates)) {
            $ot = $updates['open_time'];
            $ct = $updates['close_time'];
            if ($ot !== null && $ct !== null && trim($ot) !== '' && trim($ct) !== '') {
                $t1 = strtotime($ot);
                $t2 = strtotime($ct);
                if ($t1 === false || $t2 === false || $t1 >= $t2) {
                    echo json_encode(['ok' => false, 'message' => 'Horario inválido']);
                    exit;
                }
            }
        }

        // Preparar SET dinámico
        $sets = [];
        $params = [];
        foreach ($updates as $k => $v) {
            if (in_array($k, ['images','categories','contact_info','sections_json'])) {
                // Guardar como JSON/text
                if (is_array($v)) $val = json_encode($v);
                else $val = is_string($v) ? $v : json_encode($v);
                $sets[] = "`$k` = :$k";
                $params[":$k"] = $val;
            } else {
                $sets[] = "`$k` = :$k";
                $params[":$k"] = $v;
            }
        }

        $params[':id'] = $id;
        $sql = 'UPDATE pages SET ' . implode(', ', $sets) . ' WHERE id = :id';

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $updated = array_keys($updates);
            echo json_encode(['ok' => true, 'message' => 'Página actualizada correctamente', 'updated_fields' => $updated]);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Error al actualizar la página', 'detail' => $e->getMessage()]);
            exit;
        }
    }

    // CREACIÓN (comportamiento previo)
    $title = isset($input['title']) ? trim($input['title']) : '';
    $content = isset($input['content']) ? trim($input['content']) : '';
    $promo = isset($input['promo_message']) ? trim($input['promo_message']) : null;
    $images = isset($input['images']) ? $input['images'] : [];
    $categories = isset($input['categories']) ? $input['categories'] : [];
    $section = isset($input['section_type']) ? $input['section_type'] : null;
    $page_type = isset($input['page_type']) ? $input['page_type'] : null;
    $open_time = isset($input['open_time']) ? (trim($input['open_time']) === '' ? null : $input['open_time']) : null;
    $close_time = isset($input['close_time']) ? (trim($input['close_time']) === '' ? null : $input['close_time']) : null;
    $sections_json = isset($input['sections_json']) ? $input['sections_json'] : null;
    $logo_url = isset($input['logo_url']) ? $input['logo_url'] : null;
    $contact = isset($input['contact_info']) ? $input['contact_info'] : new stdClass();

    if ($title === '') {
        http_response_code(400);
        echo json_encode(['error' => 'El título es requerido']);
        exit;
    }

    try {
        // Generar slug a partir del título
        function make_slug($s) {
            $s = mb_strtolower($s, 'UTF-8');
            $s = preg_replace('/[^a-z0-9\s-]/u', '', $s);
            $s = preg_replace('/[\s-]+/', '-', trim($s));
            return $s;
        }

        $baseSlug = make_slug($title ?: 'page');
        $slug = $baseSlug;
        $i = 1;
        // Asegurar unicidad
        $check = $pdo->prepare('SELECT COUNT(*) AS c FROM pages WHERE slug = :slug');
        while (true) {
            $check->execute([':slug' => $slug]);
            $count = (int)$check->fetch()['c'];
            if ($count === 0) break;
            $i++;
            $slug = $baseSlug . '-' . $i;
        }

        // validar horarios si ambos vienen
        if ($open_time !== null && $close_time !== null) {
            $t1 = strtotime($open_time);
            $t2 = strtotime($close_time);
            if ($t1 === false || $t2 === false || $t1 >= $t2) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => 'Horario inválido']);
                exit;
            }
        }

        $stmt = $pdo->prepare('INSERT INTO pages (title, content, promo_message, images, categories, section_type, page_type, open_time, close_time, sections_json, logo_url, contact_info, slug) VALUES (:title, :content, :promo, :images, :categories, :section, :page_type, :open_time, :close_time, :sections_json, :logo_url, :contact, :slug)');
        $stmt->execute([
            ':title' => $title,
            ':content' => $content,
            ':promo' => $promo,
            ':images' => json_encode($images),
            ':categories' => json_encode($categories),
            ':section' => $section,
            ':page_type' => $page_type,
            ':open_time' => $open_time,
            ':close_time' => $close_time,
            ':sections_json' => is_array($sections_json) ? json_encode($sections_json) : ($sections_json === null ? null : $sections_json),
            ':logo_url' => $logo_url,
            ':contact' => json_encode($contact),
            ':slug' => $slug,
        ]);
        $id = (int)$pdo->lastInsertId();
        http_response_code(201);
        echo json_encode(['id' => $id, 'title' => $title, 'content' => $content, 'promo_message' => $promo, 'images' => $images, 'categories' => $categories, 'section_type' => $section, 'page_type' => $page_type, 'open_time' => $open_time, 'close_time' => $close_time, 'sections_json' => is_array($sections_json) ? $sections_json : ($sections_json ? json_decode($sections_json, true) : null), 'logo_url' => $logo_url, 'contact_info' => $contact, 'slug' => $slug]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Insert failed', 'detail' => $e->getMessage()]);
        exit;
    }
}

if ($method === 'GET') {
    try {
        // Soporta consulta por slug: /api/pages.php?slug=valor
        if (isset($_GET['slug']) && trim($_GET['slug']) !== '') {
            $slugParam = trim($_GET['slug']);
            $stmt = $pdo->prepare('SELECT id, title, content, promo_message, images, categories, section_type, page_type, open_time, close_time, sections_json, logo_url, contact_info, created_at, slug FROM pages WHERE slug = :slug LIMIT 1');
            $stmt->execute([':slug' => $slugParam]);
            $p = $stmt->fetch();
            if (!$p) {
                http_response_code(404);
                echo json_encode(['error' => 'Page not found']);
                exit;
            }
            $p['images'] = $p['images'] ? json_decode($p['images'], true) : [];
            $p['categories'] = $p['categories'] ? json_decode($p['categories'], true) : [];
            $p['sections_json'] = $p['sections_json'] ? (is_string($p['sections_json']) ? json_decode($p['sections_json'], true) : $p['sections_json']) : null;
            $p['logo_url'] = $p['logo_url'] ?: null;
            $p['contact_info'] = $p['contact_info'] ? json_decode($p['contact_info'], true) : new stdClass();
            echo json_encode(['page' => $p]);
            exit;
        }

        $stmt = $pdo->query('SELECT id, title, content, promo_message, images, categories, section_type, page_type, open_time, close_time, sections_json, logo_url, contact_info, created_at, slug FROM pages ORDER BY created_at DESC');
        $pages = $stmt->fetchAll();
        // Decodificar JSON fields
        foreach ($pages as & $p) {
            $p['images'] = $p['images'] ? json_decode($p['images'], true) : [];
            $p['categories'] = $p['categories'] ? json_decode($p['categories'], true) : [];
            $p['sections_json'] = $p['sections_json'] ? (is_string($p['sections_json']) ? json_decode($p['sections_json'], true) : $p['sections_json']) : null;
            $p['logo_url'] = $p['logo_url'] ?: null;
            $p['contact_info'] = $p['contact_info'] ? json_decode($p['contact_info'], true) : new stdClass();
        }
        echo json_encode(['pages' => $pages]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Query failed', 'detail' => $e->getMessage()]);
        exit;
    }
}

// Método no soportado
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

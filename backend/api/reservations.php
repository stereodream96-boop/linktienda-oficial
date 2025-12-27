<?php
// backend/api/reservations.php
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

// Ensure reservations table
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `service_reservations` (
        `id` INT NOT NULL AUTO_INCREMENT,
        `page_id` INT NOT NULL,
        `service_id` INT NOT NULL,
        `date` DATE NOT NULL,
        `start_time` TIME NOT NULL,
        `end_time` TIME NOT NULL,
        `customer_name` VARCHAR(255) NULL,
        `customer_phone` VARCHAR(100) NULL,
        `notes` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        INDEX (`page_id`),
        INDEX (`service_id`),
        INDEX (`date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) { }

function ensure_page_open_close($pdo, $page_id) {
    $stmt = $pdo->prepare('SELECT page_type, open_time, close_time FROM pages WHERE id = :id');
    $stmt->execute([':id'=>$page_id]);
    $p = $stmt->fetch();
    if (!$p) return ['ok'=>false,'message'=>'Página no encontrada'];
    return ['ok'=>true,'open_time'=>$p['open_time'] ?? null,'close_time'=>$p['close_time'] ?? null,'page_type'=>$p['page_type'] ?? null];
}

function has_overlap_res($pdo, $page_id, $service_id, $date, $new_start, $new_end) {
    // check reservations for the same page and service to avoid blocking other services
    $sql = 'SELECT start_time,end_time FROM service_reservations WHERE page_id = :pid AND service_id = :sid AND date = :date';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':pid'=>$page_id,':sid'=>$service_id,':date'=>$date]);
    $rows = $stmt->fetchAll();
    foreach ($rows as $r) {
        $s = strtotime($r['start_time']);
        $e = strtotime($r['end_time']);
        if ($new_start < $e && $new_end > $s) return true;
    }
    return false;
}

try {
    if ($method === 'GET') {
        // Support fetching reservations by page_id, service_id and date
        $page_id = isset($_GET['page_id']) ? (int)$_GET['page_id'] : 0;
        $service_id = isset($_GET['service_id']) ? (int)$_GET['service_id'] : 0;
        $date = isset($_GET['date']) ? $_GET['date'] : null;
        if ($page_id > 0 && $service_id > 0 && $date) {
            $stmt = $pdo->prepare('SELECT id,page_id,service_id,date,start_time,end_time,customer_name,customer_phone,notes,created_at FROM service_reservations WHERE page_id = :pid AND service_id = :sid AND date = :date ORDER BY start_time');
            $stmt->execute([':pid'=>$page_id,':sid'=>$service_id,':date'=>$date]);
            $rows = $stmt->fetchAll();
            // build normalized reserved list and map (HH:MM)
            $reserved = [];
            $reservedMap = [];
            foreach ($rows as $r) {
                $st = isset($r['start_time']) ? substr($r['start_time'], 0, 5) : '';
                if ($st !== '') {
                    $reserved[] = $st;
                    $reservedMap[$st] = true;
                }
            }
            echo json_encode(['ok'=>true,'reservations'=>$rows,'reserved'=>$reserved,'reservedMap'=>$reservedMap]); exit;
        }
    }

    if ($method === 'POST') {
        $action = isset($_GET['action']) ? $_GET['action'] : (isset($input['action']) ? $input['action'] : null);
        if ($action === 'create') {
            $page_id = isset($input['page_id']) ? (int)$input['page_id'] : 0;
            $service_id = isset($input['service_id']) ? (int)$input['service_id'] : 0;
            $date = isset($input['date']) ? $input['date'] : null;
            $start_time = isset($input['start_time']) ? $input['start_time'] : null;
            $name = isset($input['customer_name']) ? $input['customer_name'] : null;
            $phone = isset($input['customer_phone']) ? $input['customer_phone'] : null;
            $notes = isset($input['notes']) ? $input['notes'] : null;
            if ($page_id <=0 || $service_id <= 0 || !$date || !$start_time) { echo json_encode(['ok'=>false,'message'=>'page_id, service_id, date y start_time requeridos']); exit; }
            $chk = ensure_page_open_close($pdo, $page_id);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            // ensure page_type is Servicio
            if (!isset($chk['page_type']) || strtolower($chk['page_type']) !== 'servicio') { echo json_encode(['ok'=>false,'message'=>'La página no es de tipo Servicio']); exit; }
            // fetch service duration
            $stmt = $pdo->prepare('SELECT duration_minutes, page_id FROM page_services WHERE id = :id');
            $stmt->execute([':id'=>$service_id]); $svc = $stmt->fetch();
            if (!$svc) { echo json_encode(['ok'=>false,'message'=>'Servicio no encontrado']); exit; }
            if ((int)$svc['page_id'] !== $page_id) { echo json_encode(['ok'=>false,'message'=>'El servicio no pertenece a la página indicada']); exit; }
            $duration = (int)$svc['duration_minutes']; if ($duration <= 0) { echo json_encode(['ok'=>false,'message'=>'Duración inválida']); exit; }
            $dtStart = DateTime::createFromFormat('Y-m-d H:i', $date . ' ' . $start_time);
            if (!$dtStart) { echo json_encode(['ok'=>false,'message'=>'Formato de fecha/hora inválido']); exit; }
            $dtEnd = clone $dtStart; $dtEnd->modify("+$duration minutes");
            $new_start = $dtStart->getTimestamp(); $new_end = $dtEnd->getTimestamp(); $end_time = $dtEnd->format('H:i:s');
            // check open/close
            $open = $chk['open_time']; $close = $chk['close_time'];
            if ($open && $close) {
                $openTs = strtotime($open); $closeTs = strtotime($close);
                if ($new_start < $openTs || $new_end > $closeTs) { echo json_encode(['ok'=>false,'message'=>'Turno fuera del horario de atención']); exit; }
            }
            // If there is an explicit turn for this page/service/date/start_time, enforce capacity
            try {
                $tstmt = $pdo->prepare('SELECT id,capacity FROM service_turns WHERE page_id = :pid AND service_id = :sid AND date = :date AND start_time = :start LIMIT 1');
                $tstmt->execute([':pid'=>$page_id,':sid'=>$service_id,':date'=>$date,':start'=>$start_time]);
                $turn = $tstmt->fetch();
                if ($turn) {
                    $cstmt = $pdo->prepare('SELECT COUNT(*) AS c FROM service_reservations WHERE page_id = :pid AND service_id = :sid AND date = :date AND start_time = :start');
                    $cstmt->execute([':pid'=>$page_id,':sid'=>$service_id,':date'=>$date,':start'=>$start_time]);
                    $count = (int)$cstmt->fetch()['c'];
                    if ($turn['capacity'] !== null && $turn['capacity'] > 0 && $count >= (int)$turn['capacity']) {
                        echo json_encode(['ok'=>false,'message'=>'No hay cupos disponibles en ese turno']); exit;
                    }
                }
            } catch (PDOException $e) {
                // ignore and continue to overlap check
            }
            // check overlap with existing reservations (fallback) — only for same service
            if (has_overlap_res($pdo, $page_id, $service_id, $date, $new_start, $new_end)) { echo json_encode(['ok'=>false,'message'=>'Horario ocupado']); exit; }
            // insert
            $stmt = $pdo->prepare('INSERT INTO service_reservations (page_id,service_id,date,start_time,end_time,customer_name,customer_phone,notes) VALUES (:page_id,:service_id,:date,:start,:end,:name,:phone,:notes)');
            $stmt->execute([':page_id'=>$page_id,':service_id'=>$service_id,':date'=>$date,':start'=>$start_time,':end'=>$end_time,':name'=>$name,':phone'=>$phone,':notes'=>$notes]);
            echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId()]); exit;
        }
        echo json_encode(['ok'=>false,'message'=>'Action no soportada']); exit;
    }
    http_response_code(405); echo json_encode(['error'=>'Method not allowed']);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['error'=>'Query failed','detail'=>$e->getMessage()]);
}

exit;

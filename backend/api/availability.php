<?php
// backend/api/availability.php
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

// Ensure service_turns table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `service_turns` (
        `id` INT NOT NULL AUTO_INCREMENT,
        `page_id` INT NOT NULL,
        `service_id` INT NOT NULL,
        `date` DATE NOT NULL,
        `start_time` TIME NOT NULL,
        `end_time` TIME NOT NULL,
        `capacity` INT DEFAULT 1,
        `notes` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        INDEX (`page_id`),
        INDEX (`service_id`),
        INDEX (`date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) { }

function ensure_service_page($pdo, $page_id) {
    $stmt = $pdo->prepare('SELECT page_type, open_time, close_time FROM pages WHERE id = :id');
    $stmt->execute([':id' => $page_id]);
    $p = $stmt->fetch();
    if (!$p) return ['ok'=>false,'message'=>'Página no encontrada'];
    if (!isset($p['page_type']) || strtolower($p['page_type']) !== strtolower('Servicio')) return ['ok'=>false,'message'=>'Esta página no es de tipo Servicio'];
    return ['ok'=>true,'open_time'=>isset($p['open_time'])?$p['open_time']:null,'close_time'=>isset($p['close_time'])?$p['close_time']:null];
}

// Helper: check overlap
function has_overlap($pdo, $page_id, $date, $new_start, $new_end, $exclude_id = null) {
    $sql = 'SELECT id,start_time,end_time FROM service_turns WHERE page_id = :pid AND date = :date';
    $params = [':pid'=>$page_id,':date'=>$date];
    if ($exclude_id) { $sql .= ' AND id != :eid'; $params[':eid'] = $exclude_id; }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
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
        $page_id = isset($_GET['page_id']) ? (int)$_GET['page_id'] : 0;
        if ($page_id <= 0) { echo json_encode(['ok'=>false,'message'=>'page_id requerido']); exit; }
        $chk = ensure_service_page($pdo, $page_id);
        if (!$chk['ok']) { echo json_encode($chk); exit; }
        $from = isset($_GET['from']) ? $_GET['from'] : null;
        $to = isset($_GET['to']) ? $_GET['to'] : null;
        $sql = 'SELECT id,page_id,service_id,date,start_time,end_time,capacity,notes,created_at FROM service_turns WHERE page_id = :pid';
        $params = [':pid'=>$page_id];
        if ($from) { $sql .= ' AND date >= :from'; $params[':from'] = $from; }
        if ($to) { $sql .= ' AND date <= :to'; $params[':to'] = $to; }
        $sql .= ' ORDER BY date, start_time';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        echo json_encode(['ok'=>true,'turns'=>$rows]); exit;
    }

    if ($method === 'POST') {
        $action = isset($_GET['action']) ? $_GET['action'] : (isset($input['action']) ? $input['action'] : null);
        if ($action === 'create') {
            $page_id = isset($input['page_id']) ? (int)$input['page_id'] : 0;
            $service_id = isset($input['service_id']) ? (int)$input['service_id'] : 0;
            $date = isset($input['date']) ? $input['date'] : null;
            $start_time = isset($input['start_time']) ? $input['start_time'] : null;
            $capacity = isset($input['capacity']) ? (int)$input['capacity'] : 1;
            $notes = isset($input['notes']) ? $input['notes'] : null;
            if ($page_id <= 0 || $service_id <= 0 || !$date || !$start_time) { echo json_encode(['ok'=>false,'message'=>'page_id, service_id, date y start_time requeridos']); exit; }
            $chk = ensure_service_page($pdo, $page_id);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            // get service duration
            $stmt = $pdo->prepare('SELECT duration_minutes, page_id FROM page_services WHERE id = :id');
            $stmt->execute([':id'=>$service_id]);
            $svc = $stmt->fetch();
            if (!$svc) { echo json_encode(['ok'=>false,'message'=>'Servicio no encontrado']); exit; }
            if ((int)$svc['page_id'] !== $page_id) { echo json_encode(['ok'=>false,'message'=>'El servicio no pertenece a la página indicada']); exit; }
            $duration = (int)$svc['duration_minutes'];
            if ($duration <= 0) { echo json_encode(['ok'=>false,'message'=>'Duración del servicio inválida']); exit; }
            // compute end_time
            $dtStart = DateTime::createFromFormat('Y-m-d H:i', $date . ' ' . $start_time);
            if (!$dtStart) { echo json_encode(['ok'=>false,'message'=>'Formato de fecha/hora inválido']); exit; }
            $dtEnd = clone $dtStart;
            $dtEnd->modify("+$duration minutes");
            $new_start = $dtStart->getTimestamp();
            $new_end = $dtEnd->getTimestamp();
            $end_time = $dtEnd->format('H:i:s');
            // Respect open/close if set
            $open = $chk['open_time'];
            $close = $chk['close_time'];
            if ($open && $close) {
                $openTs = strtotime($open);
                $closeTs = strtotime($close);
                if ($new_start < $openTs || $new_end > $closeTs) { echo json_encode(['ok'=>false,'message'=>'El turno queda fuera del horario de atención']); exit; }
            }
            // check overlaps
            if (has_overlap($pdo, $page_id, $date, $new_start, $new_end)) { echo json_encode(['ok'=>false,'message'=>'Horario ocupado: existe un turno solapado']); exit; }
            // prevent creating a turn that would overlap existing reservations
            try {
                $rstmt = $pdo->prepare('SELECT COUNT(*) AS c FROM service_reservations WHERE page_id = :pid AND service_id = :sid AND date = :date AND NOT (end_time <= :start OR start_time >= :end)');
                $rstmt->execute([':pid'=>$page_id,':sid'=>$service_id,':date'=>$date,':start'=>$start_time,':end'=>$end_time]);
                $rc = (int)$rstmt->fetch()['c'];
                if ($rc > 0) { echo json_encode(['ok'=>false,'message'=>'No se puede crear el turno: existen reservas en ese horario']); exit; }
            } catch (PDOException $e) { }
            // insert
            $stmt = $pdo->prepare('INSERT INTO service_turns (page_id,service_id,date,start_time,end_time,capacity,notes) VALUES (:page_id,:service_id,:date,:start,:end,:capacity,:notes)');
            $stmt->execute([':page_id'=>$page_id,':service_id'=>$service_id,':date'=>$date,':start'=>$start_time,':end'=>$end_time,':capacity'=>$capacity,':notes'=>$notes]);
            echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId()]); exit;
        }

        if ($action === 'update') {
            $id = isset($input['id']) ? (int)$input['id'] : 0;
            if ($id <= 0) { echo json_encode(['ok'=>false,'message'=>'id requerido']); exit; }
            $stmt = $pdo->prepare('SELECT * FROM service_turns WHERE id = :id');
            $stmt->execute([':id'=>$id]);
            $row = $stmt->fetch();
            if (!$row) { echo json_encode(['ok'=>false,'message'=>'Turno no encontrado']); exit; }
            $page_id = (int)$row['page_id'];
            $chk = ensure_service_page($pdo, $page_id);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            // prepare new values
            $service_id = array_key_exists('service_id',$input) ? (int)$input['service_id'] : (int)$row['service_id'];
            $date = array_key_exists('date',$input) ? $input['date'] : $row['date'];
            $start_time = array_key_exists('start_time',$input) ? $input['start_time'] : $row['start_time'];
            $capacity = array_key_exists('capacity',$input) ? (int)$input['capacity'] : (int)$row['capacity'];
            $notes = array_key_exists('notes',$input) ? $input['notes'] : $row['notes'];
            // fetch service duration
            $stmt = $pdo->prepare('SELECT duration_minutes, page_id FROM page_services WHERE id = :id');
            $stmt->execute([':id'=>$service_id]);
            $svc = $stmt->fetch();
            if (!$svc) { echo json_encode(['ok'=>false,'message'=>'Servicio no encontrado']); exit; }
            if ((int)$svc['page_id'] !== $page_id) { echo json_encode(['ok'=>false,'message'=>'El servicio no pertenece a la página indicada']); exit; }
            $duration = (int)$svc['duration_minutes'];
            if ($duration <= 0) { echo json_encode(['ok'=>false,'message'=>'Duración del servicio inválida']); exit; }
            // compute end
            $dtStart = DateTime::createFromFormat('Y-m-d H:i', $date . ' ' . $start_time);
            if (!$dtStart) { echo json_encode(['ok'=>false,'message'=>'Formato de fecha/hora inválido']); exit; }
            $dtEnd = clone $dtStart; $dtEnd->modify("+$duration minutes");
            $new_start = $dtStart->getTimestamp(); $new_end = $dtEnd->getTimestamp(); $end_time = $dtEnd->format('H:i:s');
            // open/close
            $open = $chk['open_time']; $close = $chk['close_time'];
            if ($open && $close) {
                $openTs = strtotime($open);
                $closeTs = strtotime($close);
                if ($new_start < $openTs || $new_end > $closeTs) { echo json_encode(['ok'=>false,'message'=>'El turno queda fuera del horario de atención']); exit; }
            }
            // check overlaps excluding current id
            if (has_overlap($pdo, $page_id, $date, $new_start, $new_end, $id)) { echo json_encode(['ok'=>false,'message'=>'Horario ocupado: existe un turno solapado']); exit; }
            // build update
            $fields = ['service_id = :service_id','date = :date','start_time = :start_time','end_time = :end_time','capacity = :capacity','notes = :notes'];
            $params = [':service_id'=>$service_id,':date'=>$date,':start_time'=>$start_time,':end_time'=>$end_time,':capacity'=>$capacity,':notes'=>$notes,':id'=>$id];
            $sql = 'UPDATE service_turns SET '.implode(', ',$fields).' WHERE id = :id';
            $ustmt = $pdo->prepare($sql);
            $ustmt->execute($params);
            echo json_encode(['ok'=>true,'rows'=>$ustmt->rowCount()]); exit;
        }

        if ($action === 'delete') {
            $id = isset($input['id']) ? (int)$input['id'] : 0;
            if ($id <= 0) { echo json_encode(['ok'=>false,'message'=>'id requerido']); exit; }
            $stmt = $pdo->prepare('SELECT page_id FROM service_turns WHERE id = :id');
            $stmt->execute([':id'=>$id]);
            $r = $stmt->fetch();
            if (!$r) { echo json_encode(['ok'=>false,'message'=>'Turno no encontrado']); exit; }
            $chk = ensure_service_page($pdo, $r['page_id']);
            if (!$chk['ok']) { echo json_encode($chk); exit; }
            $stmt = $pdo->prepare('DELETE FROM service_turns WHERE id = :id');
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

<?php
// backend/api/upload_images.php
// Recibe archivos multipart y los guarda en backend/uploads/
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uploadDir = __DIR__ . '/../uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$saved = [];
foreach ($_FILES as $file) {
    if (!is_array($file['name'])) {
        $names = [$file['name']];
        $tmps = [$file['tmp_name']];
        $errs = [$file['error']];
    } else {
        $names = $file['name'];
        $tmps = $file['tmp_name'];
        $errs = $file['error'];
    }
    for ($i = 0; $i < count($names); $i++) {
        if ($errs[$i] !== UPLOAD_ERR_OK) continue;
        $orig = $names[$i];
        $ext = pathinfo($orig, PATHINFO_EXTENSION);
        $safe = bin2hex(random_bytes(8)) . ($ext ? ".$ext" : '');
        $dest = $uploadDir . DIRECTORY_SEPARATOR . $safe;
        if (move_uploaded_file($tmps[$i], $dest)) {
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'];
            $base = $scheme . '://' . $host;
            $url = $base . '/LinkTiendas/Link%20Tienda/backend/uploads/' . $safe;
            $saved[] = $url;
        }
    }
}

echo json_encode(['uploaded' => $saved]);

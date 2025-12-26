<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (strpos($uri, '/api/products') !== false) {
    require __DIR__ . '/api/products.php';
    exit;
}

echo json_encode(['message' => 'API raíz - Link Tienda']);

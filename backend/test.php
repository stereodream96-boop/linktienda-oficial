<?php
// Archivo de prueba: devuelve JSON con información básica para depuración
header('Content-Type: application/json');
$info = [
    'ok' => true,
    'request_uri' => isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : null,
    'script_name' => isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : null,
    'php_version' => phpversion(),
    'sapi' => php_sapi_name(),
];
echo json_encode($info);

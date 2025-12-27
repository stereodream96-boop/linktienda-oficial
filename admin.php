<?php
// admin.php - simple guard for serving the admin UI only when session auth is present.
session_start();

// Adjust PUBLIC_ENTRY if you want to redirect unauthenticated users
$PUBLIC_ENTRY = '/index.php';

if (!isset($_SESSION['auth']) || $_SESSION['auth'] !== true) {
    header('Location: ' . $PUBLIC_ENTRY);
    exit;
}

// If authenticated, serve the frontend admin index (assumes frontend build lives in frontend/)
$index = __DIR__ . '/frontend/index.html';
if (file_exists($index)) {
    readfile($index);
    exit;
}

// Fallback
http_response_code(404);
echo 'Admin UI not found';

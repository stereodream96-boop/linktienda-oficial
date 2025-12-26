<?php
// backend/echo.php
// Simple echo endpoint for testing in browser. Use ?msg=TuTexto
$msg = isset($_GET['msg']) ? $_GET['msg'] : 'Echo desde Link Tienda';
// Sanitize for HTML
$safe = htmlspecialchars($msg, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?><!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Echo</title>
    <style>body{font-family:Arial;margin:20px}</style>
  </head>
  <body>
    <h1><?php echo $safe; ?></h1>
    <p>URL de prueba: <code>?msg=Tu%20mensaje</code></p>
  </body>
</html>

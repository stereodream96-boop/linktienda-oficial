<?php
// backend/api/products.php
// Devuelve la lista de productos en JSON desde la base de datos `link_tienda`.

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración de conexión (consistente con README.md)
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

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    // If the database does not exist (SQLSTATE 1049), try to create it automatically.
    if ($e->getCode() == 1049) {
        try {
            $dsnNoDb = "mysql:host=$host;charset=$charset";
            $pdoNoDb = new PDO($dsnNoDb, $user, $pass, $options);
            $pdoNoDb->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdoNoDb->exec("USE `$db`");
            $pdoNoDb->exec("CREATE TABLE IF NOT EXISTS `products` (
                `id` INT NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(255) NOT NULL,
                `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
            // Insert sample data if table empty
            $count = $pdoNoDb->query('SELECT COUNT(*) AS c FROM products')->fetch()['c'];
            if ($count == 0) {
                $pdoNoDb->exec("INSERT INTO `products` (`name`, `price`) VALUES
                    ('Camiseta', 19.90),
                    ('Pantalones', 39.50),
                    ('Gorra', 9.99)");
            }
            // Reconnect using the full DSN
            $pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e2) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create database', 'detail' => $e2->getMessage()]);
            exit;
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed', 'detail' => $e->getMessage()]);
        exit;
    }
}

try {
    $stmt = $pdo->query('SELECT id, name, price FROM products');
    $products = $stmt->fetchAll();
    echo json_encode(['products' => $products]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed', 'detail' => $e->getMessage()]);
    exit;
}

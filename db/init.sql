-- Script de inicialización para XAMPP / phpMyAdmin
CREATE DATABASE IF NOT EXISTS `link_tienda` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `link_tienda`;

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `products` (`name`, `price`) VALUES
('Camiseta', 19.90),
('Pantalones', 39.50),
('Gorra', 9.99);

-- Tabla para páginas creadas desde el panel de administración
CREATE TABLE IF NOT EXISTS `pages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `promo_message` TEXT NULL,
  `images` TEXT NULL,
  `categories` TEXT NULL,
  `slug` VARCHAR(255) NULL,
  `section_type` VARCHAR(100) NULL,
  `contact_info` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
)
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índice único en slug
ALTER TABLE `pages` ADD UNIQUE INDEX `idx_pages_slug` (`slug`(255));

-- Ejemplo de página con campos extra
INSERT INTO `pages` (`title`, `content`, `promo_message`, `images`, `categories`, `section_type`, `contact_info`) VALUES
('Página de ejemplo', 'Contenido de prueba para la página de ejemplo.', '5% off en compras mayores a $50', '[]', '[]', 'Ofertas destacadas', '{}');

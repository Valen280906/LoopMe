/* LOOPME DATABASE EXPORT */
SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS loopme;
CREATE DATABASE loopme;
USE loopme;

/* Table structure for table `alertas_stock` */
CREATE TABLE `alertas_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `fecha_alerta` datetime DEFAULT CURRENT_TIMESTAMP,
  `mensaje` varchar(255) DEFAULT NULL,
  `resuelta` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `alertas_stock_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* Table structure for table `categorias` */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* Dumping data for table `categorias` */
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (1, 'Camisetas', 'Camisetas básicas, estampadas y de diferentes estilos');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (2, 'Pantalones', 'Jeans, chinos, leggings y otros tipos de pantalones');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (3, 'Vestidos', 'Vestidos casuales, de fiesta y de verano');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (4, 'Chaquetas', 'Chaquetas, abrigos y blazers');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (5, 'Sudaderas', 'Hoodies y sudaderas casuales');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (6, 'Faldas', 'Faldas de diferentes largos y estilos');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (7, 'Ropa Interior', 'Ropa interior y prendas básicas');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (8, 'Accesorios', 'Bolsos, cinturones, gorros y otros accesorios');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (9, 'Calzado', 'Zapatos, zapatillas y sandalias');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (10, 'Trajes de Baño', 'Bikinis y bañadores');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (11, 'Ropa Deportiva', 'Leggings, tops y prendas para entrenamiento');

/* Table structure for table `clientes` */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* Table structure for table `detalles_pedido` */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* Table structure for table `inventario` */
CREATE TABLE `inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `stock_actual` int DEFAULT '0',
  `stock_minimo` int DEFAULT '5',
  `stock_bajo` tinyint(1) DEFAULT '0',
  `ultima_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `producto_id` (`producto_id`),
  CONSTRAINT `inventario_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* Table structure for table `pagos` */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* Table structure for table `pedidos` */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* Table structure for table `productos` */
CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `descripcion` text,
  `precio` decimal(10,2) NOT NULL,
  `talla` varchar(50) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `categoria_id` int DEFAULT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `categoria_id` (`categoria_id`),
  CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* Table structure for table `usuarios` */
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `email` varchar(120) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('Administrador') NOT NULL DEFAULT 'Administrador',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* Dumping data for table `usuarios` */
INSERT INTO `usuarios` (`id`, `nombre`, `apellido`, `email`, `password`, `rol`, `activo`, `fecha_registro`) VALUES (1, 'Admin', 'LoopMe', 'admin@loopme.com', '$2b$10$dXfRP8YDnHlt.eOBLTzDhmm6P4leYmCqSanTm/8TxNJjQCJyPnm', 'Administrador', 1, '2026-01-28 00:52:43');


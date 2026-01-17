CREATE DATABASE IF NOT EXISTS loopme;
USE loopme;

-- USUARIOS

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador','Vendedor','Inventario') NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

net start MySQL95


-- CLIENTES
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    apellido VARCHAR(120),
    email VARCHAR(120),
    telefono VARCHAR(25),
    direccion VARCHAR(255),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- CATEGORIAS
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255)
) ENGINE=InnoDB;

-- PRODUCTOS
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    talla VARCHAR(20) NULL,
    color VARCHAR(40),
    activo BOOLEAN DEFAULT TRUE,
    categoria_id INT,
    imagen_url VARCHAR(255),

    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        ON UPDATE CASCADE 
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- INVENTARIO (1-1 PRODUCTO)
CREATE TABLE inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT UNIQUE NOT NULL,
    stock_actual INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    stock_bajo BOOLEAN DEFAULT FALSE,
    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ALERTAS STOCK
CREATE TABLE alertas_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    fecha_alerta DATETIME DEFAULT CURRENT_TIMESTAMP,
    mensaje VARCHAR(255),
    resuelta BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- PEDIDOS
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NULL,
    usuario_id INT NOT NULL,
    fecha_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Pendiente','EnPreparacion','Enviado','Entregado','Cancelado') DEFAULT 'Pendiente',
    total DECIMAL(10,2) DEFAULT 0,

    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        ON UPDATE CASCADE 
        ON DELETE SET NULL,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- DETALLES PEDIDO
CREATE TABLE detalles_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- PAGOS
CREATE TABLE pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    metodo ENUM('Efectivo','Tarjeta','Stripe') NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Aprobado','Rechazado') DEFAULT 'Aprobado',
    referencia VARCHAR(120),

    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- TRIGGER: Actualiza stock al vender
DELIMITER $$

CREATE TRIGGER tr_update_stock_after_sale
AFTER INSERT ON detalles_pedido
FOR EACH ROW
BEGIN
    UPDATE inventario 
    SET stock_actual = stock_actual - NEW.cantidad,
        ultima_actualizacion = CURRENT_TIMESTAMP
    WHERE producto_id = NEW.producto_id;

    INSERT INTO alertas_stock(producto_id, mensaje)
    SELECT NEW.producto_id, 'Stock bajo, requiere reposición'
    FROM inventario i
    WHERE i.producto_id = NEW.producto_id
    AND i.stock_actual <= i.stock_minimo;
END$$

DELIMITER ;

-- TRIGGER: marcar stock_bajo automáticamente
DELIMITER $$

CREATE TRIGGER tr_mark_low_stock
AFTER UPDATE ON inventario
FOR EACH ROW
BEGIN
    IF NEW.stock_actual <= NEW.stock_minimo THEN
        UPDATE inventario 
        SET stock_bajo = TRUE
        WHERE id = NEW.id;
    ELSE
        UPDATE inventario
        SET stock_bajo = FALSE
        WHERE id = NEW.id;
    END IF;
END$$

DELIMITER ;

INSERT INTO usuarios(nombre, apellido, email, password, rol, activo)
VALUES ('Admin', 'LoopMe', 'admin@loopme.com', '1234', 'Administrador', 1);

ALTER TABLE clientes 
ADD password VARCHAR(255) NOT NULL AFTER email;
ALTER TABLE clientes
ADD activo BOOLEAN DEFAULT TRUE;
ALTER TABLE clientes
ADD UNIQUE (email);

INSERT INTO clientes(nombre, apellido, email, password, activo)
VALUES ('Juan', 'Perez', 'cliente@loopme.com', '1234', 1);

SELECT * FROM clientes WHERE email='cliente@loopme.com';

UPDATE usuarios 
SET rol = 'Administrador' 
WHERE rol IN ('Vendedor', 'Inventario');
ALTER TABLE usuarios 
MODIFY COLUMN rol ENUM('Administrador') NOT NULL DEFAULT 'Administrador';
DELETE FROM usuarios WHERE rol NOT IN ('Administrador');

SELECT id, nombre, email, rol FROM usuarios;

INSERT INTO categorias (nombre, descripcion) VALUES
('Camisetas', 'Camisetas básicas, estampadas y de diferentes estilos'),
('Pantalones', 'Jeans, chinos, leggings y otros tipos de pantalones'),
('Vestidos', 'Vestidos casuales, de fiesta y de verano'),
('Chaquetas', 'Chaquetas, abrigos y blazers'),
('Sudaderas', 'Hoodies y sudaderas casuales'),
('Faldas', 'Faldas de diferentes largos y estilos'),
('Ropa Interior', 'Ropa interior y prendas básicas'),
('Accesorios', 'Bolsos, cinturones, gorros y otros accesorios'),
('Calzado', 'Zapatos, zapatillas y sandalias'),
('Trajes de Baño', 'Bikinis y bañadores'),
('Ropa Deportiva', 'Leggings, tops y prendas para entrenamiento');

USE loopme;
ALTER TABLE productos MODIFY COLUMN talla VARCHAR(50) NULL;
ALTER TABLE productos MODIFY COLUMN color VARCHAR(50) NULL;

DROP TRIGGER IF EXISTS tr_mark_low_stock;

-- Desactivar restricciones de clave foránea temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Borrar todos los productos (esto también borrará inventario por CASCADE)
TRUNCATE TABLE productos;

-- Borrar manualmente inventario por si acaso
TRUNCATE TABLE inventario;

-- Borrar alertas de stock
TRUNCATE TABLE alertas_stock;

-- Borrar categorías (opcional - si quieres empezar de cero)
TRUNCATE TABLE categorias;
-- Luego inserta las categorías básicas de nuevo:
INSERT INTO categorias (nombre, descripcion) VALUES
('Camisetas', 'Camisetas básicas, estampadas y de diferentes estilos'),
('Pantalones', 'Jeans, chinos, leggings y otros tipos de pantalones'),
('Vestidos', 'Vestidos casuales, de fiesta y de verano'),
('Chaquetas', 'Chaquetas, abrigos y blazers'),
('Sudaderas', 'Hoodies y sudaderas casuales'),
('Faldas', 'Faldas de diferentes largos y estilos'),
('Ropa Interior', 'Ropa interior y prendas básicas'),
('Accesorios', 'Bolsos, cinturones, gorros y otros accesorios'),
('Calzado', 'Zapatos, zapatillas y sandalias'),
('Trajes de Baño', 'Bikinis y bañadores'),
('Ropa Deportiva', 'Leggings, tops y prendas para entrenamiento');

-- Reactivar restricciones de clave foránea
SET FOREIGN_KEY_CHECKS = 1;

-- Verificar que está vacío
SELECT COUNT(*) as total_productos FROM productos;
SELECT COUNT(*) as total_inventario FROM inventario;
SELECT * FROM clientes;
TRUNCATE TABLE clientes;

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
    talla ENUM('S','M','L','XL') NULL,
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

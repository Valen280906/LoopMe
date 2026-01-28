const express = require("express");
const router = express.Router();
const db = require("../db");
const upload = require('../multerConfig');
const verifyToken = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

// Rutas públicas (sin autenticación necesaria)
router.get("/", (req, res) => {
    const sql = `
        SELECT p.*, c.nombre as categoria, i.stock_actual, i.stock_minimo, i.stock_bajo
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN inventario i ON p.id = i.producto_id
        WHERE p.activo = 1
        ORDER BY p.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Error al obtener productos"
            });
        }
        res.json({ success: true, productos: results });
    });
});

// Obtener un producto por ID (público)
router.get("/:id", (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT p.*, c.nombre as categoria, i.stock_actual, i.stock_minimo, i.stock_bajo
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN inventario i ON p.id = i.producto_id
        WHERE p.id = ? AND p.activo = 1
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Error al obtener producto"
            });
        }

        if (results.length === 0) {
            return res.json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        res.json({ success: true, producto: results[0] });
    });
});

// Rutas protegidas (solo admin)
// Crear nuevo producto con imagen
router.post("/", verifyToken, isAdmin, upload.single('imagen'), (req, res) => {
    let imagen_url = null;

    // Si hay imagen subida
    if (req.file) {
        imagen_url = `/uploads/${req.file.filename}`;
    }

    const {
        nombre, descripcion, precio, talla, color,
        categoria_id, stock_actual, stock_minimo
    } = req.body;

    console.log("Datos recibidos en POST:", {
        nombre, descripcion, precio, talla, color,
        categoria_id, stock_actual, stock_minimo
    });

    if (!nombre || !precio) {
        return res.status(400).json({
            success: false,
            message: "Nombre y precio son obligatorios"
        });
    }

    // Validar formato de nombre (letras y números)
    const nombreRegex = /^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ.]+$/;
    if (!nombreRegex.test(nombre.trim())) {
        return res.status(400).json({
            success: false,
            message: "El nombre solo puede contener letras y números"
        });
    }

    // La descripción ya no tiene validación restrictiva de caracteres

    // Validar formato de color (letras, espacios y comas)
    if (color && color.trim()) {
        const colorRegex = /^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ ,]+$/;
        if (!colorRegex.test(color.trim())) {
            return res.status(400).json({
                success: false,
                message: "El color solo puede contener letras, espacios y comas"
            });
        }
    }

    // Validar y limpiar talla
    let tallaValue = talla;
    if (tallaValue && typeof tallaValue === 'string') {
        tallaValue = tallaValue.trim();
        // Si es un número, convertirlo a string
        if (!isNaN(tallaValue)) {
            tallaValue = tallaValue.toString();
        }
    } else {
        tallaValue = null;
    }

    // Validar y limpiar color
    let colorValue = color;
    if (colorValue && typeof colorValue === 'string') {
        colorValue = colorValue.trim();
    } else {
        colorValue = null;
    }

    // Validar precio
    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
        return res.status(400).json({
            success: false,
            message: "Precio debe ser un número positivo"
        });
    }

    // Insertar producto
    const sqlProducto = `
        INSERT INTO productos (nombre, descripcion, precio, talla, color, categoria_id, imagen_url, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;

    const params = [
        nombre.trim(),
        (descripcion && descripcion.trim()) || null,
        precioNum,
        tallaValue,
        colorValue,
        categoria_id || null,
        imagen_url
    ];

    console.log("Insertando producto con parámetros:", params);

    db.query(sqlProducto, params, (err, result) => {
        if (err) {
            console.error("Error en query de producto:", err);
            return res.status(500).json({
                success: false,
                message: "Error al crear producto: " + err.message
            });
        }

        const productoId = result.insertId;

        // Crear registro en inventario
        const sqlInventario = `
            INSERT INTO inventario (producto_id, stock_actual, stock_minimo)
            VALUES (?, ?, ?)
        `;

        const stockActual = parseInt(stock_actual) || 0;
        const stockMinimo = parseInt(stock_minimo) || 5;

        db.query(sqlInventario,
            [productoId, stockActual, stockMinimo],
            (errInv) => {
                if (errInv) {
                    console.error("Error en query de inventario:", errInv);
                    // Intentar eliminar el producto si falla el inventario
                    db.query("DELETE FROM productos WHERE id = ?", [productoId]);
                    return res.status(500).json({
                        success: false,
                        message: "Error al crear inventario: " + errInv.message
                    });
                }

                res.json({
                    success: true,
                    message: "Producto creado exitosamente",
                    id: productoId,
                    imagen_url: imagen_url
                });
            });
    });
});

// Actualizar producto (admin) - VERSIÓN CORREGIDA
router.put("/:id", verifyToken, isAdmin, upload.single('imagen'), (req, res) => {
    const { id } = req.params;
    let imagen_url = req.body.imagen_url;

    // Si hay nueva imagen subida
    if (req.file) {
        imagen_url = `/uploads/${req.file.filename}`;
        console.log("Nueva imagen subida:", imagen_url);
    } else if (imagen_url) {
        // Si viene una URL completa del frontend, extraer solo la ruta
        if (imagen_url.includes('localhost:3000')) {
            imagen_url = imagen_url.split('localhost:3000')[1];
            console.log("URL convertida a ruta relativa:", imagen_url);
        }
    }

    const {
        nombre, descripcion, precio, talla, color,
        categoria_id, stock_actual, stock_minimo
    } = req.body;

    console.log("=== ACTUALIZAR PRODUCTO ===");
    console.log("ID:", id);
    console.log("Datos recibidos:", {
        nombre, descripcion, precio, talla, color,
        categoria_id, stock_actual, stock_minimo, imagen_url
    });

    // Validar precio
    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
        return res.status(400).json({
            success: false,
            message: "Precio debe ser un número positivo"
        });
    }

    // Validar formato de nombre (letras y números)
    if (nombre) {
        const nombreRegex = /^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ. ]+$/;
        if (!nombreRegex.test(nombre.trim())) {
            return res.status(400).json({
                success: false,
                message: "El nombre solo puede contener letras y números"
            });
        }
    }

    // La descripción ya no tiene validación restrictiva de caracteres

    // Validar formato de color (letras, espacios y comas)
    if (color && color.trim()) {
        const colorRegex = /^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ ,]+$/;
        if (!colorRegex.test(color.trim())) {
            return res.status(400).json({
                success: false,
                message: "El color solo puede contener letras, espacios y comas"
            });
        }
    }

    // 1. Primero actualizar el producto
    const sqlProducto = `
        UPDATE productos 
        SET nombre=?, descripcion=?, precio=?, talla=?, color=?, 
            categoria_id=?, imagen_url=?
        WHERE id=?
    `;

    const productoParams = [
        nombre,
        descripcion || null,
        precioNum,
        talla || null,
        color || null,
        categoria_id || null,
        imagen_url,
        id
    ];

    console.log("Actualizando producto...");

    db.query(sqlProducto, productoParams, (err, result) => {
        if (err) {
            console.error("Error al actualizar producto:", err);
            return res.status(500).json({
                success: false,
                message: "Error al actualizar producto: " + err.message
            });
        }

        console.log("Producto actualizado. Filas afectadas:", result.affectedRows);

        // 2. Luego actualizar el inventario si es necesario
        if (stock_actual !== undefined || stock_minimo !== undefined) {
            // Obtener el stock actual para calcular stock_bajo
            db.query(
                "SELECT stock_actual, stock_minimo FROM inventario WHERE producto_id = ?",
                [id],
                (errStock, stockResult) => {
                    if (errStock) {
                        console.error("Error al obtener stock actual:", errStock);
                        return res.status(500).json({
                            success: false,
                            message: "Error al obtener información de stock"
                        });
                    }

                    if (stockResult.length === 0) {
                        console.log("No se encontró inventario para el producto, creando...");
                        // Si no existe inventario, crearlo
                        const stockActual = parseInt(stock_actual) || 0;
                        const stockMinimo = parseInt(stock_minimo) || 5;
                        const stockBajo = stockActual <= stockMinimo ? 1 : 0;

                        const sqlInsertInventario = `
                            INSERT INTO inventario (producto_id, stock_actual, stock_minimo, stock_bajo)
                            VALUES (?, ?, ?, ?)
                        `;

                        db.query(sqlInsertInventario, [id, stockActual, stockMinimo, stockBajo], (errInsert) => {
                            if (errInsert) {
                                console.error("Error al crear inventario:", errInsert);
                                return res.status(500).json({
                                    success: false,
                                    message: "Error al crear inventario: " + errInsert.message
                                });
                            }

                            console.log("Inventario creado exitosamente");
                            return res.json({
                                success: true,
                                message: "Producto actualizado exitosamente"
                            });
                        });
                    } else {
                        const currentStock = stockResult[0];
                        const newStockActual = stock_actual !== undefined ? parseInt(stock_actual) : currentStock.stock_actual;
                        const newStockMinimo = stock_minimo !== undefined ? parseInt(stock_minimo) : currentStock.stock_minimo;
                        const stockBajo = newStockActual <= newStockMinimo ? 1 : 0;

                        // Actualizar inventario con stock_bajo calculado
                        const sqlInventario = `
                            UPDATE inventario 
                            SET stock_actual = ?, 
                                stock_minimo = ?,
                                stock_bajo = ?,
                                ultima_actualizacion = CURRENT_TIMESTAMP
                            WHERE producto_id = ?
                        `;

                        const inventarioParams = [newStockActual, newStockMinimo, stockBajo, id];

                        console.log("Actualizando inventario...");

                        db.query(sqlInventario, inventarioParams, (errInv) => {
                            if (errInv) {
                                console.error("Error al actualizar inventario:", errInv);
                                return res.status(500).json({
                                    success: false,
                                    message: "Error al actualizar inventario: " + errInv.message
                                });
                            }

                            console.log("Inventario actualizado exitosamente");
                            return res.json({
                                success: true,
                                message: "Producto actualizado exitosamente"
                            });
                        });
                    }
                }
            );
        } else {
            console.log("No se actualizó inventario, solo producto");
            return res.json({
                success: true,
                message: "Producto actualizado exitosamente"
            });
        }
    });
});

// Eliminar producto (desactivar) - solo admin
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
    const { id } = req.params;

    const sql = "UPDATE productos SET activo = 0 WHERE id = ?";

    db.query(sql, [id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Error al eliminar producto"
            });
        }

        res.json({
            success: true,
            message: "Producto eliminado exitosamente"
        });
    });
});

module.exports = router;
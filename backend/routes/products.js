const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todos los productos (con inventario)
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
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener productos" 
            });
        }
        res.json({ success: true, productos: results });
    });
});

// Obtener un producto por ID
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
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener producto" 
            });
        }
        
        if(results.length === 0) {
            return res.json({ 
                success: false, 
                message: "Producto no encontrado" 
            });
        }
        
        res.json({ success: true, producto: results[0] });
    });
});

// Crear nuevo producto (solo admin)
router.post("/", (req, res) => {
    const { 
        nombre, descripcion, precio, talla, color, 
        categoria_id, imagen_url, stock_actual, stock_minimo 
    } = req.body;
    
    if(!nombre || !precio) {
        return res.json({ 
            success: false, 
            message: "Nombre y precio son obligatorios" 
        });
    }
    
    // Insertar producto
    const sqlProducto = `
        INSERT INTO productos (nombre, descripcion, precio, talla, color, categoria_id, imagen_url, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    db.query(sqlProducto, 
        [nombre, descripcion, precio, talla, color, categoria_id, imagen_url], 
        (err, result) => {
            if(err) {
                console.error(err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error al crear producto" 
                });
            }
            
            const productoId = result.insertId;
            
            // Crear registro en inventario
            const sqlInventario = `
                INSERT INTO inventario (producto_id, stock_actual, stock_minimo)
                VALUES (?, ?, ?)
            `;
            
            db.query(sqlInventario, 
                [productoId, stock_actual || 0, stock_minimo || 5], 
                (errInv) => {
                    if(errInv) {
                        console.error(errInv);
                        // Intentar eliminar el producto si falla el inventario
                        db.query("DELETE FROM productos WHERE id = ?", [productoId]);
                        return res.status(500).json({ 
                            success: false, 
                            message: "Error al crear inventario" 
                        });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: "Producto creado exitosamente",
                        id: productoId
                    });
                });
        });
});

// Actualizar producto (solo admin)
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { 
        nombre, descripcion, precio, talla, color, 
        categoria_id, imagen_url, stock_actual, stock_minimo 
    } = req.body;
    
    // Actualizar producto
    const sqlProducto = `
        UPDATE productos 
        SET nombre=?, descripcion=?, precio=?, talla=?, color=?, 
            categoria_id=?, imagen_url=?
        WHERE id=?
    `;
    
    db.query(sqlProducto, 
        [nombre, descripcion, precio, talla, color, categoria_id, imagen_url, id], 
        (err) => {
            if(err) {
                console.error(err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error al actualizar producto" 
                });
            }
            
            // Actualizar inventario
            const sqlInventario = `
                UPDATE inventario 
                SET stock_actual=?, stock_minimo=?
                WHERE producto_id=?
            `;
            
            db.query(sqlInventario, 
                [stock_actual, stock_minimo, id], 
                (errInv) => {
                    if(errInv) {
                        console.error(errInv);
                        return res.status(500).json({ 
                            success: false, 
                            message: "Error al actualizar inventario" 
                        });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: "Producto actualizado exitosamente" 
                    });
                });
        });
});

// Eliminar producto (desactivar)
router.delete("/:id", (req, res) => {
    const { id } = req.params;
    
    const sql = "UPDATE productos SET activo = 0 WHERE id = ?";
    
    db.query(sql, [id], (err) => {
        if(err) {
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
const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener inventario completo con alertas
router.get("/", (req, res) => {
    const sql = `
        SELECT p.id, p.nombre, p.precio, p.imagen_url, 
               i.stock_actual, i.stock_minimo, i.stock_bajo,
               i.ultima_actualizacion,
               CASE 
                   WHEN i.stock_actual <= 0 THEN 'Agotado'
                   WHEN i.stock_actual <= i.stock_minimo THEN 'Stock Bajo'
                   ELSE 'Disponible'
               END as estado_stock
        FROM productos p
        JOIN inventario i ON p.id = i.producto_id
        WHERE p.activo = 1
        ORDER BY i.stock_actual ASC, i.stock_bajo DESC
    `;
    
    db.query(sql, (err, results) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener inventario" 
            });
        }
        
        res.json({ success: true, inventario: results });
    });
});

// Obtener alertas de stock bajo
router.get("/alertas", (req, res) => {
    const sql = `
        SELECT p.nombre, i.stock_actual, i.stock_minimo,
               i.ultima_actualizacion, a.mensaje, a.fecha_alerta
        FROM inventario i
        JOIN productos p ON i.producto_id = p.id
        LEFT JOIN alertas_stock a ON p.id = a.producto_id AND a.resuelta = 0
        WHERE i.stock_actual <= i.stock_minimo 
        AND p.activo = 1
        ORDER BY i.stock_actual ASC
    `;
    
    db.query(sql, (err, results) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener alertas" 
            });
        }
        
        res.json({ success: true, alertas: results });
    });
});

// Actualizar stock de un producto
router.put("/:id/stock", (req, res) => {
    const { id } = req.params;
    const { stock_actual, stock_minimo } = req.body;
    
    if(stock_actual === undefined) {
        return res.json({ 
            success: false, 
            message: "El stock actual es requerido" 
        });
    }
    
    const sql = `
        UPDATE inventario 
        SET stock_actual = ?, 
            stock_minimo = COALESCE(?, stock_minimo),
            ultima_actualizacion = CURRENT_TIMESTAMP
        WHERE producto_id = ?
    `;
    
    db.query(sql, [stock_actual, stock_minimo, id], (err, result) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al actualizar stock" 
            });
        }
        
        if(result.affectedRows === 0) {
            return res.json({ 
                success: false, 
                message: "Producto no encontrado" 
            });
        }
        
        // Verificar si se debe generar alerta
        if(stock_actual <= (stock_minimo || 5)) {
            const mensaje = `Stock bajo: ${stock_actual} unidades (mínimo: ${stock_minimo || 5})`;
            db.query(
                "INSERT INTO alertas_stock (producto_id, mensaje) VALUES (?, ?)",
                [id, mensaje]
            );
        }
        
        res.json({ 
            success: true, 
            message: "Stock actualizado exitosamente" 
        });
    });
});

// Marcar alerta como resuelta
router.post("/:id/alerta/resolver", (req, res) => {
    const { id } = req.params;
    
    const sql = `
        UPDATE alertas_stock 
        SET resuelta = 1 
        WHERE producto_id = ? AND resuelta = 0
    `;
    
    db.query(sql, [id], (err, result) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al resolver alerta" 
            });
        }
        
        // También actualizar el flag de stock_bajo
        db.query(
            "UPDATE inventario SET stock_bajo = 0 WHERE producto_id = ?",
            [id]
        );
        
        res.json({ 
            success: true, 
            message: "Alerta resuelta exitosamente" 
        });
    });
});

module.exports = router;
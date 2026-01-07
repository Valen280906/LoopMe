const express = require("express");
const router = express.Router();
const db = require("../db");

// Reporte de ventas por período
router.get("/ventas", (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    
    let sql = `
        SELECT DATE(p.fecha_pedido) as fecha, 
               COUNT(*) as total_pedidos,
               SUM(p.total) as total_ventas,
               AVG(p.total) as ticket_promedio
        FROM pedidos p
        WHERE p.estado NOT IN ('Cancelado')
    `;
    
    const params = [];
    
    if(fecha_inicio && fecha_fin) {
        sql += " AND DATE(p.fecha_pedido) BETWEEN ? AND ?";
        params.push(fecha_inicio, fecha_fin);
    }
    
    sql += " GROUP BY DATE(p.fecha_pedido) ORDER BY fecha DESC";
    
    db.query(sql, params, (err, results) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al generar reporte" 
            });
        }
        
        res.json({ success: true, ventas: results });
    });
});

// Productos más vendidos
router.get("/top-productos", (req, res) => {
    const { limite = 10 } = req.query;
    
    const sql = `
        SELECT p.nombre, 
               SUM(dp.cantidad) as cantidad_vendida,
               SUM(dp.subtotal) as total_recaudado,
               pr.nombre as categoria
        FROM detalles_pedido dp
        JOIN productos p ON dp.producto_id = p.id
        LEFT JOIN categorias pr ON p.categoria_id = pr.id
        JOIN pedidos pe ON dp.pedido_id = pe.id
        WHERE pe.estado NOT IN ('Cancelado')
        GROUP BY dp.producto_id
        ORDER BY cantidad_vendida DESC
        LIMIT ?
    `;
    
    db.query(sql, [parseInt(limite)], (err, results) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener productos más vendidos" 
            });
        }
        
        res.json({ success: true, productos: results });
    });
});

// Reporte de inventario
router.get("/inventario", (req, res) => {
    const sql = `
        SELECT p.nombre, p.precio,
               i.stock_actual, i.stock_minimo, i.stock_bajo,
               CASE 
                   WHEN i.stock_actual <= 0 THEN 'Agotado'
                   WHEN i.stock_actual <= i.stock_minimo THEN 'Stock Bajo'
                   ELSE 'Disponible'
               END as estado,
               i.ultima_actualizacion,
               (i.stock_actual * p.precio) as valor_total
        FROM productos p
        JOIN inventario i ON p.id = i.producto_id
        WHERE p.activo = 1
        ORDER BY i.stock_actual ASC
    `;
    
    db.query(sql, (err, results) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al generar reporte de inventario" 
            });
        }
        
        res.json({ success: true, inventario: results });
    });
});

module.exports = router;
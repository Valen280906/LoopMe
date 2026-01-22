const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

// Middleware de seguridad para todas las rutas de reportes
router.use(verifyToken, isAdmin);

// Obtener estadísticas principales del dashboard
router.get("/dashboard-stats", async (req, res) => {
    try {
        const connection = db.promise();

        // 1. Total Productos
        const [prodRows] = await connection.query("SELECT COUNT(*) as total FROM productos WHERE activo = 1");

        // 2. Ventas de Hoy
        const [salesRows] = await connection.query(`
            SELECT SUM(p.total) as total 
            FROM pedidos p
            JOIN pagos pag ON p.id = pag.pedido_id
            WHERE DATE(p.fecha_pedido) = CURDATE() 
            AND p.estado != 'Cancelado'
            AND pag.estado = 'Aprobado'
        `);

        // 3. Alertas de Stock Bajo (Calculado dinámicamente)
        const [stockRows] = await connection.query("SELECT COUNT(*) as total FROM inventario WHERE stock_actual <= COALESCE(stock_minimo, 5) AND stock_actual > 0");

        // 4. Clientes Registrados
        const [clientRows] = await connection.query("SELECT COUNT(*) as total FROM clientes");

        res.json({
            success: true,
            stats: {
                totalProductos: prodRows[0].total,
                ventasHoy: salesRows[0].total || 0,
                stockBajo: stockRows[0].total,
                totalClientes: clientRows[0].total
            }
        });

    } catch (error) {
        console.error("Error obteniendo estadísticas:", error);
        res.status(500).json({ success: false, message: "Error al obtener estadísticas" });
    }
});

// Obtener datos para el gráfico de ventas (últimos 7 días)
router.get("/sales-chart", async (req, res) => {
    try {
        const sql = `
            SELECT DATE(p.fecha_pedido) as fecha, SUM(p.total) as total
            FROM pedidos p
            JOIN pagos pag ON p.id = pag.pedido_id
            WHERE p.fecha_pedido >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            AND p.estado != 'Cancelado'
            AND pag.estado = 'Aprobado'
            GROUP BY DATE(p.fecha_pedido)
            ORDER BY fecha ASC
        `;

        const [rows] = await db.promise().query(sql);

        // Formatear datos para el frontend
        // Asegurarnos de tener los últimos 7 días aunque no haya ventas
        const result = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const found = rows.find(r => {
                // Manejar tanto objeto Date como string dependiendo del driver
                const rowDate = r.fecha instanceof Date ? r.fecha.toISOString().split('T')[0] : r.fecha;
                return rowDate === dateStr;
            });

            result.push({
                fecha: date.toLocaleDateString('es-ES', { weekday: 'short' }), // Ej: "lun"
                total: found ? parseFloat(found.total) : 0
            });
        }

        res.json({
            success: true,
            chartData: result
        });

    } catch (error) {
        console.error("Error obteniendo datos del gráfico:", error);
        res.status(500).json({ success: false, message: "Error al obtener datos del gráfico" });
    }
});

// Obtener productos más vendidos (Top 5)
router.get("/top-products", async (req, res) => {
    try {
        const sql = `
            SELECT p.nombre, SUM(dp.cantidad) as total_vendido
            FROM detalles_pedido dp
            JOIN productos p ON dp.producto_id = p.id
            JOIN pedidos ped ON dp.pedido_id = ped.id
            JOIN pagos pag ON ped.id = pag.pedido_id
            WHERE ped.estado != 'Cancelado' 
            AND pag.estado = 'Aprobado'
            GROUP BY p.id, p.nombre
            ORDER BY total_vendido DESC
            LIMIT 5
        `;
        const [rows] = await db.promise().query(sql);
        res.json({ success: true, products: rows });
    } catch (error) {
        console.error("Error obteniendo productos top:", error);
        res.status(500).json({ success: false, message: "Error al obtener productos top" });
    }
});

// Obtener alertas detalladas de stock
router.get("/stock-alerts", async (req, res) => {
    try {
        const sql = `
            SELECT p.nombre, i.stock_actual, i.stock_minimo, 
                   (i.stock_actual <= COALESCE(i.stock_minimo, 5)) as stock_bajo
            FROM inventario i
            JOIN productos p ON i.producto_id = p.id
            WHERE i.stock_actual <= COALESCE(i.stock_minimo, 5)
            ORDER BY i.stock_actual ASC
        `;
        const [rows] = await db.promise().query(sql);
        res.json({ success: true, alerts: rows });
    } catch (error) {
        console.error("Error obteniendo alertas de stock:", error);
        res.status(500).json({ success: false, message: "Error al obtener alertas de stock" });
    }
});

// Obtener resumen de alertas recientes para dashboard
router.get("/recent-alerts", async (req, res) => {
    try {
        const connection = db.promise();

        // 1. Stock bajo (Calculado dinámicamente con COALESCE para evitar fallos por NULL)
        const [lowStock] = await connection.query(`
            SELECT p.nombre, i.stock_actual 
            FROM inventario i 
            JOIN productos p ON i.producto_id = p.id 
            WHERE i.stock_actual <= COALESCE(i.stock_minimo, 5) AND i.stock_actual > 0
            LIMIT 10
        `);

        // 2. Agotados
        const [outOfStock] = await connection.query(`
            SELECT p.nombre 
            FROM inventario i 
            JOIN productos p ON i.producto_id = p.id 
            WHERE i.stock_actual = 0
            LIMIT 3
        `);

        // 3. Nuevos pedidos (hoy) - Solo pedidos con pago aprobado o en proceso legítimo
        const [newOrders] = await connection.query(`
            SELECT COUNT(DISTINCT p.id) as total 
            FROM pedidos p
            LEFT JOIN pagos pag ON p.id = pag.pedido_id
            WHERE DATE(p.fecha_pedido) = CURDATE() 
            AND (pag.estado = 'Aprobado' OR p.estado NOT IN ('Cancelado', 'Pendiente'))
        `);

        res.json({
            success: true,
            alerts: {
                lowStock: lowStock,
                outOfStock: outOfStock,
                newOrdersCount: newOrders[0].total
            }
        });
    } catch (error) {
        console.error("Error obteniendo alertas recientes:", error);
        res.status(500).json({ success: false, message: "Error al obtener alertas recientes" });
    }
});

module.exports = router;
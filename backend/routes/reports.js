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
            SELECT SUM(total) as total 
            FROM pedidos 
            WHERE DATE(fecha_pedido) = CURDATE() 
            AND estado != 'Cancelado'
        `);

        // 3. Alertas de Stock Bajo
        const [stockRows] = await connection.query("SELECT COUNT(*) as total FROM inventario WHERE stock_bajo = 1");

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
            SELECT DATE(fecha_pedido) as fecha, SUM(total) as total
            FROM pedidos
            WHERE fecha_pedido >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            AND estado != 'Cancelado'
            GROUP BY DATE(fecha_pedido)
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

module.exports = router;
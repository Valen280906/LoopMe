const express = require("express");
const router = express.Router();
const db = require("../db");
const clienteAuth = require("../middleware/clienteAuth");

// Obtener pedidos del cliente autenticado
router.get("/my-orders", clienteAuth, async (req, res) => {
    try {
        const sql = `
            SELECT p.id, p.fecha_pedido, p.estado, p.total,
                   c.nombre as cliente_nombre
            FROM pedidos p
            JOIN clientes c ON p.cliente_id = c.id
            WHERE p.cliente_id = ?
            ORDER BY p.fecha_pedido DESC
        `;

        const [orders] = await db.promise().execute(sql, [req.cliente.id]);

        res.json({
            success: true,
            pedidos: orders
        });

    } catch (error) {
        console.error("Error fetching my orders:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener mis pedidos"
        });
    }
});

// Obtener todos los pedidos (Admin)
router.get("/", (req, res) => {
    const sql = `
        SELECT p.id, p.fecha_pedido, p.estado, p.total,
               c.nombre as cliente_nombre, c.apellido as cliente_apellido,
               u.nombre as vendedor_nombre
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        JOIN usuarios u ON p.usuario_id = u.id
        ORDER BY p.fecha_pedido DESC
        LIMIT 50
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Error al obtener pedidos"
            });
        }

        res.json({ success: true, pedidos: results });
    });
});
// Crear pedido desde checkout
router.post("/create", clienteAuth, async (req, res) => {
    try {
        const { items, shipping, payment, total } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "El carrito está vacío"
            });
        }

        const connection = db.promise();

        try {
            // 0. Verificar idempotencia (evitar pedidos duplicados)
            if (payment && payment.intentId) {
                const [existingPayment] = await connection.execute(
                    "SELECT pedido_id FROM pagos WHERE referencia = ?",
                    [payment.intentId]
                );

                if (existingPayment.length > 0) {
                    return res.json({
                        success: true,
                        message: "Pedido ya procesado (idempotencia)",
                        orderId: existingPayment[0].pedido_id,
                        orderNumber: `ORD-${existingPayment[0].pedido_id.toString().padStart(6, '0')}`
                    });
                }
            }

            await connection.beginTransaction();

            // 1. Crear pedido
            const [orderResult] = await connection.execute(
                `INSERT INTO pedidos (cliente_id, usuario_id, estado, total) 
                 VALUES (?, 1, 'Pendiente', ?)`,
                [req.cliente.id, total || 0]
            );

            const orderId = orderResult.insertId;

            // 2. Agregar detalles del pedido
            for (const item of items) {
                // Verificar stock antes de proceder
                const [stockRows] = await connection.execute(
                    `SELECT stock_actual FROM inventario WHERE producto_id = ?`,
                    [item.id]
                );

                if (stockRows.length === 0 || stockRows[0].stock_actual < item.cantidad) {
                    throw new Error(`Stock insuficiente para el producto: ${item.nombre}`);
                }

                console.log(`[STOCK DEBUG] Insertando ${item.cantidad} unidades para producto ID ${item.id}. Stock actual antes: ${stockRows[0].stock_actual}`);

                await connection.execute(
                    `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?)`,
                    [orderId, item.id, item.cantidad, item.precio, item.precio * item.cantidad]
                );

                // El stock se actualiza automáticamente mediante el trigger DB: tr_update_stock_after_sale
            }

            // 5. Crear registro de pago
            await connection.execute(
                `INSERT INTO pagos (pedido_id, metodo, monto, estado, referencia)
                 VALUES (?, ?, ?, 'Aprobado', ?)`,
                [orderId, payment.method || 'Stripe', total || 0, payment.intentId || 'N/A']
            );

            await connection.commit();

            // Enviar email de confirmación (simulado)
            console.log(`Pedido #${orderId} creado exitosamente para cliente ${req.cliente.email}`);

            res.json({
                success: true,
                message: "Pedido creado exitosamente",
                orderId: orderId,
                orderNumber: `ORD-${orderId.toString().padStart(6, '0')}`
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error al crear el pedido"
        });
    }
});

// Obtener pedido por payment intent
router.get("/payment-intent/:id", clienteAuth, async (req, res) => {
    try {
        const paymentIntentId = req.params.id;

        const [orders] = await db.promise().execute(
            `SELECT p.*, c.nombre as cliente_nombre, c.email as cliente_email,
                    pa.metodo as metodo_pago, pa.referencia as referencia_pago
             FROM pedidos p 
             LEFT JOIN clientes c ON p.cliente_id = c.id
             LEFT JOIN pagos pa ON p.id = pa.pedido_id
             WHERE pa.referencia = ? AND p.cliente_id = ?`,
            [paymentIntentId, req.cliente.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        const order = orders[0];

        // Obtener detalles del pedido
        const [details] = await db.promise().execute(
            `SELECT d.*, pr.nombre as producto_nombre, pr.imagen_url
             FROM detalles_pedido d
             LEFT JOIN productos pr ON d.producto_id = pr.id
             WHERE d.pedido_id = ?`,
            [order.id]
        );

        res.json({
            success: true,
            order: {
                ...order,
                detalles: details
            }
        });

    } catch (error) {
        console.error("Error retrieving order:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener detalles del pedido"
        });
    }
});

// Obtener un pedido específico
router.get("/:id", (req, res) => {
    const { id } = req.params;

    const sqlPedido = `
        SELECT p.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido,
               c.email as cliente_email, u.nombre as vendedor_nombre
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.id = ?
    `;

    const sqlDetalles = `
        SELECT d.*, pr.nombre as producto_nombre, pr.precio as precio_unitario
        FROM detalles_pedido d
        JOIN productos pr ON d.producto_id = pr.id
        WHERE d.pedido_id = ?
    `;

    db.query(sqlPedido, [id], (err, pedidoResults) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Error al obtener pedido"
            });
        }

        if (pedidoResults.length === 0) {
            return res.json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        db.query(sqlDetalles, [id], (errDet, detalleResults) => {
            if (errDet) {
                console.error(errDet);
                return res.status(500).json({
                    success: false,
                    message: "Error al obtener detalles"
                });
            }

            res.json({
                success: true,
                pedido: pedidoResults[0],
                detalles: detalleResults
            });
        });
    });
});

// Crear nuevo pedido
router.post("/", (req, res) => {
    const { cliente_id, usuario_id, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.json({
            success: false,
            message: "Debe agregar al menos un producto"
        });
    }

    // Calcular total
    let total = 0;
    items.forEach(item => {
        total += (item.precio_unitario || 0) * (item.cantidad || 0);
    });

    // Iniciar transacción
    db.beginTransaction((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Error al iniciar transacción"
            });
        }

        // Insertar pedido
        const sqlPedido = `
            INSERT INTO pedidos (cliente_id, usuario_id, total, estado)
            VALUES (?, ?, ?, 'Pendiente')
        `;

        db.query(sqlPedido, [cliente_id || null, usuario_id, total], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error(err);
                    res.status(500).json({
                        success: false,
                        message: "Error al crear pedido"
                    });
                });
            }

            const pedidoId = result.insertId;
            const detallesInsert = [];

            // Insertar cada detalle
            items.forEach((item, index) => {
                const subtotal = (item.precio_unitario || 0) * (item.cantidad || 0);

                const sqlDetalle = `
                    INSERT INTO detalles_pedido 
                    (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                    VALUES (?, ?, ?, ?, ?)
                `;

                detallesInsert.push(new Promise((resolve, reject) => {
                    db.query(sqlDetalle,
                        [pedidoId, item.producto_id, item.cantidad, item.precio_unitario, subtotal],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                }));
            });

            // Esperar que todos los detalles se inserten
            Promise.all(detallesInsert)
                .then(() => {
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).json({
                                    success: false,
                                    message: "Error al confirmar pedido"
                                });
                            });
                        }

                        res.json({
                            success: true,
                            message: "Pedido creado exitosamente",
                            pedido_id: pedidoId,
                            total: total
                        });
                    });
                })
                .catch((err) => {
                    db.rollback(() => {
                        console.error(err);
                        res.status(500).json({
                            success: false,
                            message: "Error al agregar productos al pedido"
                        });
                    });
                });
        });
    });
});

// Actualizar estado del pedido
router.put("/:id/estado", (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['Pendiente', 'EnPreparacion', 'Enviado', 'Entregado', 'Cancelado'];

    if (!estadosValidos.includes(estado)) {
        return res.json({
            success: false,
            message: "Estado inválido"
        });
    }

    const sql = "UPDATE pedidos SET estado = ? WHERE id = ?";

    db.query(sql, [estado, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Error al actualizar estado"
            });
        }

        if (result.affectedRows === 0) {
            return res.json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        res.json({
            success: true,
            message: `Estado actualizado a: ${estado}`
        });
    });
});

module.exports = router;
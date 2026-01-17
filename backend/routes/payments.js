const express = require("express");
const router = express.Router();
const db = require("../db");
console.log("Stripe Key Loaded:", process.env.STRIPE_SECRET_KEY ? "Yes (" + process.env.STRIPE_SECRET_KEY.substring(0, 7) + "...)" : "No");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const verifyToken = require("../middleware/auth");
const clienteAuth = require("../middleware/clienteAuth");

// Crear Payment Intent
// En backend/routes/payments.js - corregir la función crear payment intent:

// Crear Payment Intent - Corregida
router.post("/create-payment-intent", async (req, res) => {  // Quitamos clienteAuth temporalmente
    try {
        const { amount, currency = 'usd', metadata } = req.body;

        // Validar monto - Convertir a centavos
        const amountInCents = Math.round(amount * 100);  // <-- AQUÍ ESTABA EL ERROR

        if (!amountInCents || amountInCents < 50) {
            return res.status(400).json({
                success: false,
                message: "Monto inválido"
            });
        }

        // Crear Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,  // Usar centavos
            currency: currency,
            metadata: {
                ...metadata,
                // Para pruebas, no requerimos cliente_id
                test_mode: "true"
            },
            payment_method_types: ['card'],
            // Configuración para desarrollo
            capture_method: 'automatic'
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            amountInDollars: paymentIntent.amount / 100
        });

    } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({
            success: false,
            message: "Error al crear el intento de pago: " + error.message
        });
    }
});

// Agregar esta ruta para crear pedidos (simplificada)
router.post("/create-order", async (req, res) => {
    try {
        const { items, shippingInfo, paymentIntentId, total } = req.body;

        // Para desarrollo, creamos un pedido simulado
        const orderId = Date.now(); // ID temporal

        console.log("Pedido recibido:", {
            orderId,
            itemsCount: items.length,
            total,
            paymentIntentId
        });

        res.json({
            success: true,
            message: "Pedido creado exitosamente",
            orderId: orderId,
            items: items.length,
            total: total,
            paymentId: paymentIntentId
        });

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            success: false,
            message: "Error al crear el pedido"
        });
    }
});

// Confirmar pago y crear pedido
router.post("/confirm-payment", clienteAuth, async (req, res) => {
    try {
        const { paymentIntentId, shippingInfo, items } = req.body;

        // Verificar Payment Intent en Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                message: "El pago no fue exitoso"
            });
        }

        // Crear pedido en la base de datos
        const connection = await db.promise().getConnection();

        try {
            await connection.beginTransaction();

            // 1. Crear pedido
            const [orderResult] = await connection.execute(
                `INSERT INTO pedidos (cliente_id, usuario_id, estado, total) 
                 VALUES (?, 1, 'Pendiente', ?)`,
                [req.cliente.id, paymentIntent.amount / 100]
            );

            const orderId = orderResult.insertId;

            // 2. Agregar detalles del pedido
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?)`,
                    [orderId, item.id, item.cantidad, item.precio, item.precio * item.cantidad]
                );

                // 3. Actualizar stock
                await connection.execute(
                    `UPDATE inventario SET stock_actual = stock_actual - ? WHERE producto_id = ?`,
                    [item.cantidad, item.id]
                );
            }

            // 4. Crear registro de pago
            await connection.execute(
                `INSERT INTO pagos (pedido_id, metodo, monto, estado, referencia)
                 VALUES (?, 'Stripe', ?, 'Aprobado', ?)`,
                [orderId, paymentIntent.amount / 100, paymentIntentId]
            );

            // 5. Guardar información de envío si existe
            if (shippingInfo) {
                // Aquí podrías guardar la información de envío en otra tabla
                // Por simplicidad, la almacenamos en un campo de texto
                await connection.execute(
                    `UPDATE pedidos SET notas = ? WHERE id = ?`,
                    [JSON.stringify(shippingInfo), orderId]
                );
            }

            await connection.commit();

            res.json({
                success: true,
                message: "Pedido creado exitosamente",
                orderId: orderId,
                paymentIntent: paymentIntent
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error("Error confirming payment:", error);
        res.status(500).json({
            success: false,
            message: "Error al confirmar el pago"
        });
    }
});

// Webhook para recibir notificaciones de Stripe (opcional para pruebas avanzadas)
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...'
        );
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Manejar diferentes tipos de eventos
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful:', paymentIntent.id);
            // Aquí podrías actualizar tu base de datos
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

// Obtener detalles de un payment intent
router.get("/payment-intent/:id", clienteAuth, async (req, res) => {
    try {
        const paymentIntentId = req.params.id;

        // Verificar en Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        // Buscar pedido relacionado
        const [orders] = await db.promise().execute(
            `SELECT p.*, c.nombre as cliente_nombre 
             FROM pedidos p 
             LEFT JOIN clientes c ON p.cliente_id = c.id
             WHERE EXISTS (
                 SELECT 1 FROM pagos 
                 WHERE pedido_id = p.id AND referencia = ?
             ) AND p.cliente_id = ?`,
            [paymentIntentId, req.cliente.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        res.json({
            success: true,
            paymentIntent: {
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                status: paymentIntent.status,
                created: new Date(paymentIntent.created * 1000)
            },
            order: orders[0]
        });

    } catch (error) {
        console.error("Error retrieving payment intent:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener detalles del pago"
        });
    }
});

router.get("/payment-intent/:id", async (req, res) => {
    try {
        const paymentIntentId = req.params.id;

        // Verificar en Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        res.json({
            success: true,
            paymentIntent: {
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100,  // Convertir a dólares
                status: paymentIntent.status,
                currency: paymentIntent.currency,
                created: new Date(paymentIntent.created * 1000),
                metadata: paymentIntent.metadata
            }
        });

    } catch (error) {
        console.error("Error retrieving payment intent:", error);

        // Si falla, devolver datos básicos para desarrollo
        res.json({
            success: true,
            paymentIntent: {
                id: req.params.id,
                amount: 0,
                status: "succeeded",
                currency: "usd",
                created: new Date(),
                metadata: { test_mode: "true" }
            },
            testMode: true
        });
    }
});

// Ruta simple para crear pedido (para desarrollo)
router.post("/create-order", async (req, res) => {
    try {
        const { items, shippingInfo, paymentIntentId, total } = req.body;

        console.log("Creando pedido de prueba:", {
            itemsCount: items?.length || 0,
            total,
            paymentIntentId
        });

        // Generar ID de pedido simulado
        const orderId = "ORD-" + Date.now().toString().slice(-8);

        res.json({
            success: true,
            message: "Pedido creado exitosamente",
            order: {
                id: orderId,
                total: total,
                fecha_pedido: new Date().toISOString(),
                estado: "Pagado",
                metodo_pago: "Stripe",
                transaction_id: paymentIntentId
            }
        });

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            success: false,
            message: "Error al crear el pedido"
        });
    }
});

// Endpoints para el Dashboard Admin (Mock Data)
router.get("/methods", (req, res) => {
    res.json({
        success: true,
        metodos: [
            { metodo: "Stripe", porcentaje: 85 },
            { metodo: "PayPal", porcentaje: 10 },
            { metodo: "Transferencia", porcentaje: 5 }
        ]
    });
});

router.get("/history", (req, res) => {
    res.json({
        success: true,
        historial: [
            { id: 101, fecha: "2024-03-10", cliente: "Juan Pérez", monto: 45.00, estado: "Completado" },
            { id: 102, fecha: "2024-03-11", cliente: "Ana García", monto: 120.50, estado: "Completado" },
            { id: 103, fecha: "2024-03-12", cliente: "Carlos Ruiz", monto: 32.00, estado: "Pendiente" }
        ]
    });
});

router.get("/pending-orders", (req, res) => {
    res.json({
        success: true,
        pedidos: [
            { id: 205, cliente: "Maria López", fecha: "2024-03-12", total: 89.99, items: 3 },
            { id: 206, cliente: "Pedro Díaz", fecha: "2024-03-12", total: 15.50, items: 1 }
        ]
    });
});

module.exports = router;
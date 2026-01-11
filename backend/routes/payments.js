const express = require("express");
const router = express.Router();
const db = require("../db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || 'sk_test_...');
const verifyToken = require("../middleware/auth");
const clienteAuth = require("../middleware/clienteAuth");

// Crear Payment Intent
router.post("/create-payment-intent", clienteAuth, async (req, res) => {
    try {
        const { amount, currency = 'usd', metadata } = req.body;
        
        // Validar monto
        if (!amount || amount < 50) { // Mínimo 50 centavos (0.50 USD)
            return res.status(400).json({
                success: false,
                message: "Monto inválido"
            });
        }
        
        // Crear Payment Intent en Stripe (modo test)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount), // Stripe usa centavos
            currency: currency,
            metadata: {
                cliente_id: req.cliente.id,
                cliente_email: req.cliente.email,
                ...metadata
            },
            // En modo test, Stripe simulará el pago
            // Podemos especificar payment_method_types si queremos
            payment_method_types: ['card'],
            // Para pruebas, podemos forzar a que ciertos métodos funcionen/fallen
            // capture_method: 'manual' // Para capturar después
        });
        
        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100 // Convertir a dólares
        });
        
    } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({
            success: false,
            message: "Error al crear el intento de pago"
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
router.post("/webhook", express.raw({type: 'application/json'}), async (req, res) => {
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
    
    res.json({received: true});
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

module.exports = router;
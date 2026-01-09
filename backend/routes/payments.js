// backend/routes/payments.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener métodos de pago disponibles
router.get("/methods", async (req, res) => {
    try {
        // Métodos de pago simulados
        const methods = [
            {
                id: 1,
                name: "Tarjeta de Crédito/Débito",
                icon: "fa-credit-card",
                description: "Pago con tarjeta Visa, MasterCard, Amex",
                enabled: true
            },
            {
                id: 2,
                name: "Transferencia Bancaria",
                icon: "fa-university",
                description: "Transferencia a nuestra cuenta bancaria",
                enabled: true
            },
            {
                id: 3,
                name: "Efectivo",
                icon: "fa-money-bill",
                description: "Pago en efectivo en tienda",
                enabled: true
            }
        ];
        
        res.json({ success: true, methods });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Error al obtener métodos de pago" });
    }
});

// Crear sesión de pago (simulación)
router.post("/create-payment-intent", async (req, res) => {
    try {
        const { amount, pedido_id, description } = req.body;
        
        // Validación básica
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Monto inválido" 
            });
        }
        
        // Simular respuesta de Stripe
        const simulatedResponse = {
            success: true,
            message: "Sesión de pago creada exitosamente",
            payment: {
                id: `pi_${Date.now()}_sim`,
                client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
                amount: amount,
                currency: "usd",
                status: "requires_payment_method",
                created: new Date().toISOString()
            },
            pedido_id: pedido_id || null
        };
        
        // NOTA: En producción, aquí se guardaría en la tabla 'pagos'
        // con estado 'pendiente' hasta confirmación
        
        res.json(simulatedResponse);
    } catch (error) {
        console.error("Error creando pago:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error al procesar el pago" 
        });
    }
});

// Confirmar pago (simulación)
router.post("/confirm/:paymentId", async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { pedido_id } = req.body;
        
        // Simular procesamiento de pago con diferentes resultados
        setTimeout(() => {
            const outcomes = ["Aprobado", "Rechazado"];
            const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
            const success = randomOutcome === "Aprobado";
            
            const result = {
                success: success,
                payment: {
                    id: paymentId,
                    status: randomOutcome,
                    updated: new Date().toISOString()
                },
                message: success 
                    ? "Pago procesado exitosamente" 
                    : "El pago fue rechazado. Intente con otro método.",
                pedido_id: pedido_id || null
            };
            
            // Si el pago es exitoso, registrar en la base de datos
            if (success && pedido_id) {
                // Insertar en la tabla pagos
                const query = `
                    INSERT INTO pagos 
                    (pedido_id, metodo, monto, estado, referencia) 
                    VALUES (?, 'Stripe', ?, 'Aprobado', ?)
                `;
                
                // Descomentar cuando quieras usar la base de datos real
                // db.execute(query, [
                //     pedido_id, 
                //     req.body.amount || 0, 
                //     paymentId
                // ]);
                
                console.log(`Pago simulado registrado para pedido ${pedido_id}`);
            }
            
            res.json(result);
        }, 1500); // Simular retraso de procesamiento
    } catch (error) {
        console.error("Error confirmando pago:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error al confirmar el pago" 
        });
    }
});

// Obtener historial de pagos
router.get("/history", async (req, res) => {
    try {
        // Primero intentar obtener de la base de datos real
        const query = `
            SELECT p.*, pd.id as pedido_numero 
            FROM pagos p
            LEFT JOIN pedidos pd ON p.pedido_id = pd.id
            ORDER BY p.fecha_pago DESC
            LIMIT 10
        `;
        
        const [rows] = await db.execute(query);
        
        if (rows && rows.length > 0) {
            // Formatear resultados de la base de datos
            const pagos = rows.map(pago => ({
                id: pago.id,
                fecha: pago.fecha_pago.toLocaleString(),
                orden_id: `ORD-${pago.pedido_numero?.toString().padStart(5, '0') || 'N/A'}`,
                monto: parseFloat(pago.monto),
                metodo: pago.metodo,
                estado: pago.estado,
                transaccion_id: pago.referencia || `ref_${pago.id}`
            }));
            
            res.json({ success: true, pagos });
        } else {
            // Si no hay datos, usar datos de ejemplo
            const pagosEjemplo = [
                {
                    id: 1,
                    fecha: "2024-01-15 14:30:00",
                    orden_id: "ORD-00123",
                    monto: 125.50,
                    metodo: "Tarjeta",
                    estado: "Aprobado",
                    transaccion_id: "txn_123456789"
                },
                {
                    id: 2,
                    fecha: "2024-01-14 11:20:00",
                    orden_id: "ORD-00122",
                    monto: 89.99,
                    metodo: "Transferencia",
                    estado: "Aprobado",
                    transaccion_id: "txn_987654321"
                },
                {
                    id: 3,
                    fecha: "2024-01-13 16:45:00",
                    orden_id: "ORD-00121",
                    monto: 45.00,
                    metodo: "Efectivo",
                    estado: "Aprobado",
                    transaccion_id: "txn_456789123"
                }
            ];
            
            res.json({ success: true, pagos: pagosEjemplo });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Error al obtener historial" });
    }
});

// Obtener pedidos disponibles para pago
router.get("/pending-orders", async (req, res) => {
    try {
        const query = `
            SELECT id, fecha_pedido, total, estado 
            FROM pedidos 
            WHERE estado IN ('Pendiente', 'EnPreparacion')
            ORDER BY fecha_pedido DESC
        `;
        
        const [rows] = await db.execute(query);
        
        res.json({ 
            success: true, 
            orders: rows.map(p => ({
                id: p.id,
                display: `ORD-${p.id.toString().padStart(5, '0')} - $${p.total} - ${p.fecha_pedido.toLocaleDateString()}`
            }))
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Error al obtener pedidos" });
    }
});

module.exports = router;
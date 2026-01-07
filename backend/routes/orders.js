const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todos los pedidos
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
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener pedidos" 
            });
        }
        
        res.json({ success: true, pedidos: results });
    });
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
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener pedido" 
            });
        }
        
        if(pedidoResults.length === 0) {
            return res.json({ 
                success: false, 
                message: "Pedido no encontrado" 
            });
        }
        
        db.query(sqlDetalles, [id], (errDet, detalleResults) => {
            if(errDet) {
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
    
    if(!items || !Array.isArray(items) || items.length === 0) {
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
        if(err) {
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
            if(err) {
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
                            if(err) reject(err);
                            else resolve();
                        });
                }));
            });
            
            // Esperar que todos los detalles se inserten
            Promise.all(detallesInsert)
                .then(() => {
                    db.commit((err) => {
                        if(err) {
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
    
    if(!estadosValidos.includes(estado)) {
        return res.json({ 
            success: false, 
            message: "Estado inválido" 
        });
    }
    
    const sql = "UPDATE pedidos SET estado = ? WHERE id = ?";
    
    db.query(sql, [estado, id], (err, result) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al actualizar estado" 
            });
        }
        
        if(result.affectedRows === 0) {
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
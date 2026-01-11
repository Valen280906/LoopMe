const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const SECRET = process.env.JWT_SECRET || "LOOPME_SUPER_SECRET";

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if(!email || !password){
        return res.json({ success:false, message:"Complete los campos" });
    }

    const sql = `SELECT id, nombre, apellido, rol, password, activo FROM usuarios WHERE email=?`;

    db.query(sql, [email], async (err, rows) => {
        if(err) return res.json({ success:false, message:"Error en servidor" });
        
        if(rows.length === 0)
            return res.json({ success:false, message:"Usuario no encontrado" });

        const user = rows[0];

        if(!user.activo)
            return res.json({ success:false, message:"Usuario inactivo" });

        // Verificar contraseña (con encriptación o sin ella para migración)
        let isValid = false;
        
        // Intenta verificar con bcrypt
        if(user.password.startsWith('$2b$')) {
            isValid = await bcrypt.compare(password, user.password);
        } else {
            // Para usuarios existentes sin encriptar
            isValid = (password === user.password);
            
            // Si es válido, actualiza a contraseña encriptada
            if(isValid) {
                const hashedPassword = await bcrypt.hash(password, 10);
                db.query("UPDATE usuarios SET password=? WHERE id=?", [hashedPassword, user.id]);
            }
        }

        if(!isValid) {
            return res.json({ success:false, message:"Contraseña incorrecta" });
        }

        // Generar token JWT
        const token = jwt.sign({
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            email: email,
            rol: user.rol
        }, SECRET, { expiresIn: "8h" });

        res.json({
            success: true,
            message: "Login correcto",
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: email,
                rol: user.rol
            }
        });
    });
});

// Verificar token
router.get("/verify", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    
    if(!token) {
        return res.json({ success: false, message: "Token requerido" });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        res.json({ success: true, user: decoded });
    } catch (error) {
        res.json({ success: false, message: "Token inválido" });
    }
});

router.post("/login-cliente", async (req, res) => {
    const { email, password } = req.body;

    if(!email || !password){
        return res.json({ success:false, message:"Complete los campos" });
    }

    const sql = `
        SELECT id, nombre, apellido, email, password, activo 
        FROM clientes 
        WHERE email=?
    `;

    db.query(sql, [email], async (err, rows) => {
        if(err) return res.json({ success:false, message:"Error en servidor" });

        if(rows.length === 0)
            return res.json({ success:false, message:"Cliente no encontrado" });

        const cliente = rows[0];

        if(cliente.activo === 0)
            return res.json({ success:false, message:"Cliente inactivo" });

        let isValid = false;

        if(cliente.password.startsWith("$2b$")){
            isValid = await bcrypt.compare(password, cliente.password);
        } else {
            isValid = password === cliente.password;

            if(isValid){
                const hash = await bcrypt.hash(password, 10);
                db.query(
                    "UPDATE clientes SET password=? WHERE id=?",
                    [hash, cliente.id]
                );
            }
        }

        if(!isValid)
            return res.json({ success:false, message:"Contraseña incorrecta" });

        const token = jwt.sign({
            id: cliente.id,
            nombre: cliente.nombre,
            apellido: cliente.apellido,
            email: cliente.email,
            tipo: "cliente"
        }, SECRET, { expiresIn: "8h" });

        res.json({
            success: true,
            message: "Login correcto",
            token,
            user: {
                id: cliente.id,
                nombre: cliente.nombre,
                apellido: cliente.apellido,
                email: cliente.email
            }
        });
    });
});

// Agregar esta ruta después de la ruta login-cliente
router.post("/registro-cliente", async (req, res) => {
    const { nombre, apellido, email, telefono, direccion, password } = req.body;

    // Validaciones
    if (!nombre || !apellido || !email || !password) {
        return res.json({ success: false, message: "Todos los campos obligatorios son requeridos" });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.json({ success: false, message: "Correo electrónico no válido" });
    }

    // Validar contraseña
    if (password.length < 8) {
        return res.json({ success: false, message: "La contraseña debe tener al menos 8 caracteres" });
    }

    try {
        // Verificar si el email ya existe
        const checkSql = "SELECT id FROM clientes WHERE email = ?";
        db.query(checkSql, [email], async (err, results) => {
            if (err) {
                console.error("Error verificando email:", err);
                return res.json({ success: false, message: "Error en el servidor" });
            }

            if (results.length > 0) {
                return res.json({ success: false, message: "Este correo ya está registrado" });
            }

            // Encriptar contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insertar nuevo cliente
            const insertSql = `
                INSERT INTO clientes 
                (nombre, apellido, email, telefono, direccion, password, activo) 
                VALUES (?, ?, ?, ?, ?, ?, 1)
            `;

            db.query(insertSql, [nombre, apellido, email, telefono || null, direccion || null, hashedPassword], 
                (err, result) => {
                    if (err) {
                        console.error("Error registrando cliente:", err);
                        return res.json({ success: false, message: "Error al registrar el cliente" });
                    }

                    res.json({
                        success: true,
                        message: "Cliente registrado exitosamente. Ahora puedes iniciar sesión.",
                        clienteId: result.insertId
                    });
                }
            );
        });
    } catch (error) {
        console.error("Error en registro-cliente:", error);
        res.json({ success: false, message: "Error interno del servidor" });
    }
});

module.exports = router;
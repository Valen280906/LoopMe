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

module.exports = router;
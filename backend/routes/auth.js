const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const SECRET = "LOOPME_SUPER_SECRET";

// LOGIN
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if(!email || !password){
        return res.json({ success:false, message:"Complete los campos" });
    }

    const sql = `SELECT id, nombre, rol, password, activo FROM usuarios WHERE email=?`;

    db.query(sql, [email], async (err, rows)=>{

        if(err) return res.json({ success:false, message:"Error servidor" });

        if(rows.length === 0)
            return res.json({ success:false, message:"Usuario no encontrado" });

        const user = rows[0];

        if(!user.activo)
            return res.json({ success:false, message:"Usuario inactivo" });

        // TEMPORAL (sin bcrypt)
        if(password !== user.password){
            return res.json({ success:false, message:"Contraseña incorrecta" });
        }

        // generar token
        const token = jwt.sign({
            id: user.id,
            nombre: user.nombre,
            rol: user.rol
        }, SECRET, { expiresIn: "2h" });

        res.json({
            success:true,
            message:"Login correcto",
            token,
            user:{
                id:user.id,
                nombre:user.nombre,
                rol:user.rol
            }
        });
    });
});

module.exports = router;

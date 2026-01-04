const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const SECRET = "LOOPME_SUPER_SECRET"; // sera luego .env

// login
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

        // contraseña simple (temporal)
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


/*middleware luego
function authMiddleware(req, res, next){
    const token = req.headers["authorization"];

    if(!token){
        return res.json({ success:false, message:"Token requerido" });
    }

    try{
        const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET);
        req.user = decoded;
        next();
    }catch{
        return res.json({ success:false, message:"Token inválido o expirado" });
    }
}

module.exports = authMiddleware;
*/
const express = require("express");
const router = express.Router();
const db = require("../db");

const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

// LISTAR USUARIOS
router.get("/", auth, isAdmin, (req,res)=>{
    db.query(
        "SELECT id, nombre, apellido, email, rol, activo FROM usuarios",
        (err, rows)=>{
            if(err) return res.json({success:false, message:"Error BD"});
            res.json({success:true, users: rows});
        }
    );
});

// CREAR USUARIO
router.post("/", auth, isAdmin, (req,res)=>{
    const {nombre, apellido, email, password, rol} = req.body;

    if(!nombre || !email || !password || !rol){
        return res.json({success:false, message:"Campos incompletos"});
    }

    const sql = `
        INSERT INTO usuarios(nombre, apellido, email, password, rol, activo)
        VALUES (?,?,?,?,?,1)
    `;

    db.query(sql, [nombre, apellido, email, password, rol], (err)=>{
        if(err){
            return res.json({success:false, message:"Error al crear usuario"});
        }

        res.json({
            success:true,
            message:"Usuario creado correctamente"
        });
    });
});

// ACTIVAR / DESACTIVAR
router.patch("/:id/status", auth, isAdmin, (req,res)=>{
    const { estado } = req.body;
    const { id } = req.params;

    db.query(
        "UPDATE usuarios SET activo=? WHERE id=?",
        [estado, id],
        (err)=>{
            if(err) return res.json({success:false, message:"Error BD"});

            res.json({
                success:true,
                message: estado ? "Usuario activado" : "Usuario desactivado"
            });
        }
    );
});

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todas las categorías
router.get("/", (req, res) => {
    const sql = "SELECT id, nombre, descripcion FROM categorias ORDER BY nombre";
    
    db.query(sql, (err, results) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener categorías" 
            });
        }
        
        res.json({ success: true, categorias: results });
    });
});

// Crear categoría (solo admin)
router.post("/", (req, res) => {
    const { nombre, descripcion } = req.body;
    
    if(!nombre) {
        return res.json({ 
            success: false, 
            message: "El nombre es obligatorio" 
        });
    }
    
    const sql = "INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)";
    
    db.query(sql, [nombre, descripcion], (err, result) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al crear categoría" 
            });
        }
        
        res.json({ 
            success: true, 
            message: "Categoría creada exitosamente",
            id: result.insertId
        });
    });
});

module.exports = router;
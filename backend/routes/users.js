const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt"); // Necesario para hashear contraseñas de nuevos usuarios

const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

// LISTAR TODOS LOS USUARIOS (ADMINS + CLIENTES)
router.get("/", auth, isAdmin, async (req, res) => {
    try {
        const queryAdmins = "SELECT id, nombre, apellido, email, rol, activo, 'admin' as type FROM usuarios";
        const queryClients = "SELECT id, nombre, apellido, email, 'Cliente' as rol, activo, 'client' as type FROM clientes";

        // Ejecutar consultas en paralelo (usando callbacks anidados o promesas si db lo soporta, aquí anidado simple)
        db.query(queryAdmins, (err, admins) => {
            if (err) return res.json({ success: false, message: "Error al obtener administradores" });

            db.query(queryClients, (err2, clients) => {
                if (err2) return res.json({ success: false, message: "Error al obtener clientes" });

                // Combinar resultados
                const allUsers = [...admins, ...clients];

                // Ordenar por ID descendente (opcional)
                allUsers.sort((a, b) => b.id - a.id);

                res.json({ success: true, users: allUsers });
            });
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error del servidor" });
    }
});

// CREAR USUARIO (ADMIN O CLIENTE)
router.post("/", auth, isAdmin, async (req, res) => {
    const { nombre, apellido, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
        return res.json({ success: false, message: "Campos incompletos" });
    }

    try {
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        if (rol === 'Administrador') {
            const sql = "INSERT INTO usuarios(nombre, apellido, email, password, rol, activo) VALUES (?,?,?,?,?,1)";
            db.query(sql, [nombre, apellido, email, hashedPassword, rol], (err) => {
                if (err) {
                    console.error(err);
                    return res.json({ success: false, message: "Error al crear administrador (posible email duplicado)" });
                }
                res.json({ success: true, message: "Administrador creado correctamente" });
            });
        } else if (rol === 'Cliente') {
            const sql = "INSERT INTO clientes(nombre, apellido, email, password, activo) VALUES (?,?,?,?,1)";
            db.query(sql, [nombre, apellido, email, hashedPassword], (err) => {
                if (err) {
                    console.error(err);
                    return res.json({ success: false, message: "Error al crear cliente (posible email duplicado)" });
                }
                res.json({ success: true, message: "Cliente creado correctamente" });
            });
        } else {
            res.json({ success: false, message: "Rol no válido" });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "Error interno" });
    }
});

// ACTIVAR / DESACTIVAR
router.patch("/:id/status", auth, isAdmin, (req, res) => {
    const { estado, type } = req.body; // 'type' debe ser 'admin' o 'client'
    const { id } = req.params;

    let table = "";
    if (type === 'admin') table = "usuarios";
    else if (type === 'client') table = "clientes";
    else return res.json({ success: false, message: "Tipo de usuario no especificado" });

    const sql = `UPDATE ${table} SET activo=? WHERE id=?`;

    db.query(sql, [estado, id], (err) => {
        if (err) return res.json({ success: false, message: "Error BD" });

        res.json({
            success: true,
            message: estado ? "Usuario activado" : "Usuario desactivado"
        });
    });
});

module.exports = router;

const express = require("express");
const cors = require("cors");
const db = require("./db");
const authMiddleware = require("./middleware/auth");
const isAdmin = require("./middleware/isAdmin");  // ← AÑADE ESTA LÍNEA
const isVendedor = require("./middleware/isVendedor");  // ← AÑADE ESTA LÍNEA
const isInventario = require("./middleware/isInventario");  // ← AÑADE ESTA LÍNEA

const app = express();

// Configuración
require("dotenv").config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas públicas
app.get("/", (req, res) => {
    res.send("Servidor LoopMe funcionando");
});

// API Routes PÚBLICAS
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/categories", require("./routes/categories"));

// Rutas protegidas
app.use("/api/secure", authMiddleware, require("./routes/secure"));

// Rutas ADMIN protegidas CON PERMISOS ESPECÍFICOS
app.use("/api/admin/products", authMiddleware, require("./routes/products"));
app.use("/api/admin/users", authMiddleware, isAdmin, require("./routes/users"));
app.use("/api/admin/inventory", authMiddleware, isInventario, require("./routes/inventory"));
app.use("/api/admin/orders", authMiddleware, isVendedor, require("./routes/orders"));
app.use("/api/admin/reports", authMiddleware, isAdmin, require("./routes/reports"));
app.use("/api/payments", authMiddleware, require("./routes/payments"));
// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend LoopMe corriendo en puerto ${PORT}`);
    console.log(`Conectado a MySQL: ${process.env.DB_NAME}`);
});
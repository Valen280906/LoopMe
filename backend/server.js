const express = require("express");
const cors = require("cors");
const db = require("./db");
const authMiddleware = require("./middleware/auth");
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
app.use("/api/auth", require("./routes/auth")); // Login libre
app.use("/api/products", require("./routes/products")); // Productos (rutas GET públicas)
app.use("/api/categories", require("./routes/categories")); // Categorías

// Rutas protegidas
app.use("/api/secure", authMiddleware, require("./routes/secure")); // Verificación

// Rutas ADMIN protegidas
app.use("/api/admin/products", authMiddleware, require("./routes/products")); // Productos protegidos
app.use("/api/admin/users", authMiddleware, require("./routes/users")); // Usuarios protegidos
app.use("/api/admin/inventory", authMiddleware, require("./routes/inventory")); // Inventario
app.use("/api/admin/orders", authMiddleware, require("./routes/orders")); // Pedidos
app.use("/api/admin/reports", authMiddleware, require("./routes/reports")); // Reportes

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
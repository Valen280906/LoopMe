// Configuración
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const authMiddleware = require("./middleware/auth");
const isAdmin = require("./middleware/isAdmin");  
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_...');
const app = express();



// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (IMPORTANTE para imágenes)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rutas públicas
app.get("/", (req, res) => {
    res.send("Servidor LoopMe funcionando");
});

// API Routes PÚBLICAS
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products")); // Rutas públicas GET
app.use("/api/categories", require("./routes/categories"));

// Rutas protegidas (solo autenticación)
app.use("/api/secure", authMiddleware, require("./routes/secure"));

// IMPORTANTE: Las rutas admin se montan en /api/admin/products
// pero dentro del router products.js ya están protegidas con verifyToken e isAdmin
app.use("/api/admin/products", require("./routes/products"));

app.use("/api/admin/users", authMiddleware, isAdmin, require("./routes/users"));
app.use("/api/admin/orders", authMiddleware, require("./routes/orders")); 
app.use("/api/admin/reports", authMiddleware, isAdmin, require("./routes/reports"));
app.use("/api/payments", require("./routes/payments"));

// Manejo de errores
app.use((err, req, res, next) => {
    console.error("Error del servidor:", err.message);
    res.status(500).json({ 
        success: false, 
        message: "Error interno del servidor: " + err.message 
    });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.use((req, res, next) => {
    // Establecer URL base para archivos estáticos
    res.locals.baseUrl = `http://localhost:${PORT}`;
    next();
});
app.listen(PORT, () => {
    console.log(`Backend LoopMe corriendo en puerto ${PORT}`);
    console.log(`Conectado a MySQL: ${process.env.DB_NAME}`);
});
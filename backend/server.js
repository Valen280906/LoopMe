// backend/server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

// Configuración CORS más flexible
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'null' // Para archivos abiertos directamente
];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir solicitudes sin origen (como archivos locales)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Servir frontend
app.use('/', express.static(path.join(__dirname, '../fronted/public')));
app.use('/admin', express.static(path.join(__dirname, '../fronted/admin')));

// Rutas específicas - Redireccionar a la ubicación correcta en /admin
app.get("/login", (req, res) => {
    res.redirect('/admin/login.html');
});

app.get("/dashboard", (req, res) => {
    res.redirect('/admin/dashboard.html');
});

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/admin/users", require("./routes/users"));
app.use("/api/reports", require("./routes/reports"));

// Rutas para checkout
app.get("/checkout", (req, res) => {
    res.sendFile(path.join(__dirname, '../fronted/public/checkout.html'));
});

app.get("/pago-exitoso", (req, res) => {
    res.sendFile(path.join(__dirname, '../fronted/public/pago-exitoso.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error("Error del servidor:", err.message);
    res.status(500).json({
        success: false,
        message: "Error interno del servidor"
    });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Backend LoopMe corriendo en: http://localhost:${PORT}`);
    console.log(`📂 Archivos frontend servidos desde: fronted/`);
    console.log(`🔌 Conectado a MySQL: ${process.env.DB_NAME || 'No configurado'}`);
});
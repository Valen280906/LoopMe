const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "perla1505", // Tu contraseña aquí
    database: process.env.DB_NAME || "loopme",
    port: process.env.DB_PORT || 3306
});

connection.connect((err) => {
    if(err) {
        console.error("❌ Error conectando a MySQL:", err.message);
        console.log("=== CONEXIÓN MYSQL CON CONTRASEÑA FIJA ===");
        // Intentar con contraseña vacía
        connection.config.password = "";
        connection.connect((err2) => {
            if(err2) {
                console.error("❌ Error en segundo intento:", err2.message);
            } else {
                console.log("✅ Conectado a MySQL (sin contraseña)");
            }
        });
    } else {
        console.log("✅ Conectado a MySQL");
    }
});

module.exports = connection;
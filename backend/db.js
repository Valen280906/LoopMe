const mysql = require("mysql2");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "loopme",
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificar conexión inicial
pool.getConnection((err, connection) => {
    if (err) {
        console.error("Error conectando a MySQL:", err.message);
    } else {
        console.log("Conectado a MySQL");
        connection.release();
    }
});

module.exports = pool;
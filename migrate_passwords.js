const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './backend/.env' });

async function migrate() {
    console.log("Starting password migration...");

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 3306
    });

    try {
        const passwordSuffix = "Lp2026!"; // Compliant suffix: Upper, Lower, Special, Number, 8+ total
        const newPasswords = [];

        // 1. Update Admins (usuarios)
        const [admins] = await connection.execute("SELECT id, nombre, email FROM usuarios");
        for (const admin of admins) {
            const rawPassword = admin.nombre.replace(/\s/g, '') + "Admin2026!"; // Ex: AdminAdmin2026!
            const hashedPassword = await bcrypt.hash(rawPassword, 10);
            await connection.execute("UPDATE usuarios SET password = ? WHERE id = ?", [hashedPassword, admin.id]);
            newPasswords.push({ type: 'Admin', nombre: admin.nombre, email: admin.email, password: rawPassword });
        }

        // 2. Update Clients (clientes)
        const [clients] = await connection.execute("SELECT id, nombre, email FROM clientes");
        for (const client of clients) {
            const rawPassword = client.nombre.replace(/\s/g, '') + "User2026!"; // Ex: JuanUser2026!
            const hashedPassword = await bcrypt.hash(rawPassword, 10);
            await connection.execute("UPDATE clientes SET password = ? WHERE id = ?", [hashedPassword, client.id]);
            newPasswords.push({ type: 'Cliente', nombre: client.nombre, email: client.email, password: rawPassword });
        }

        console.log("\nMIGRATION COMPLETED SUCCESSFULLY");
        console.log("==========================================");
        console.table(newPasswords);
        console.log("==========================================");
        console.log("Save these passwords somewhere safe.");

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await connection.end();
    }
}

migrate();

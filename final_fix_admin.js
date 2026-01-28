const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: "./backend/.env" });

async function fixPassword() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "loopme",
    });

    try {
        const password = "Admin1234!";
        const hash = await bcrypt.hash(password, 10);
        await connection.query("UPDATE usuarios SET password = ? WHERE email = 'admin@loopme.com'", [hash]);
        console.log("Admin password updated correctly for 'Admin1234!' with hash:", hash);

        // Verify immediately
        const [rows] = await connection.query("SELECT password FROM usuarios WHERE email = 'admin@loopme.com'");
        const isValid = await bcrypt.compare(password, rows[0].password);
        console.log("Verification of 'Admin1234!':", isValid);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await connection.end();
    }
}

fixPassword();

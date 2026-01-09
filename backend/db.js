const mysql = require("mysql2");

console.log("=== CONEXIÓN MYSQL CON CONTRASEÑA FIJA ===");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "perla1505",  
    database: "loopme",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if(err){
        console.log("❌ ERROR conectando a MySQL:");
        console.log("Código:", err.code);
        console.log("Mensaje:", err.sqlMessage);
        console.log("\n💡 PROBLEMA: La contraseña es incorrecta o MySQL no está aceptando conexiones.");
        
        // Prueba alternativa: verificar si MySQL acepta conexiones
        console.log("\n🔧 DIAGNÓSTICO:");
        console.log("1. Verifica que MySQL esté corriendo:");
        console.log("   Abre PowerShell como Administrador y ejecuta:");
        console.log("   net start mysql80");
        console.log("\n2. Verifica tu contraseña en MySQL:");
        console.log("   mysql -u root -pAnd_31856233");
        console.log("\n3. Si falla, prueba cambiar la contraseña:");
        console.log("   ALTER USER 'root'@'localhost' IDENTIFIED BY 'And_31856233';");
        console.log("   FLUSH PRIVILEGES;");
    }else{
        console.log("CONEXIÓN EXITOSA a MySQL!");
        console.log("Base de datos:", connection.config.database);
        console.log("Usuario:", connection.config.user);
        console.log("¿Usando contraseña?:", connection.config.password ? "Sí" : "No");
        connection.release();
    }
});

module.exports = db;
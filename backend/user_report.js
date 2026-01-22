const db = require('./db');
const fs = require('fs');

async function generateReport() {
    let report = "--- USER REPORT ---\n\n";

    db.query("SELECT * FROM usuarios", (err, users) => {
        report += "== USUARIOS ==\n";
        users.forEach(u => {
            report += `ID: ${u.id}, Email: '${u.email}', Rol: ${u.rol}, Active: ${u.activo}\n`;
        });

        db.query("SELECT * FROM clientes", (err, clients) => {
            report += "\n== CLIENTES ==\n";
            clients.forEach(c => {
                report += `ID: ${c.id}, Email: '${c.email}', Active: ${c.activo}, Password: ${c.password.substring(0, 15)}...\n`;
            });

            fs.writeFileSync('user_report.txt', report);
            console.log("Report generated.");
            process.exit();
        });
    });
}
generateReport();

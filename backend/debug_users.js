const db = require('./db');

async function debugUsers() {
    db.query("SELECT id, email, password, rol FROM usuarios", (err, users) => {
        console.log("--- USUARIOS ---");
        users.forEach(u => console.log(`${u.id}: ${u.email} | ${u.rol} | ${u.password.substring(0, 10)}...`));

        db.query("SELECT id, email, password FROM clientes", (err, clients) => {
            console.log("--- CLIENTES ---");
            clients.forEach(c => console.log(`${c.id}: ${c.email} | ${c.password.substring(0, 10)}...`));
            process.exit();
        });
    });
}
debugUsers();

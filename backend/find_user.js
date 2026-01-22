const db = require('./db');

async function findMaria() {
    const email = 'Marialop23@gmail.com';
    const email2 = 'newclient@test.com';

    console.log(`Searching for ${email} and ${email2}...`);

    db.query("SELECT * FROM usuarios WHERE email IN (?, ?)", [email, email2], (err, users) => {
        if (users.length > 0) {
            console.log("FOUND IN USUARIOS:", JSON.stringify(users, null, 2));
        } else {
            console.log("NOT FOUND IN USUARIOS");
        }

        db.query("SELECT * FROM clientes WHERE email IN (?, ?)", [email, email2], (err, clients) => {
            if (clients.length > 0) {
                console.log("FOUND IN CLIENTES:", JSON.stringify(clients, null, 2));
            } else {
                console.log("NOT FOUND IN CLIENTES");
            }
            process.exit();
        });
    });
}
findMaria();

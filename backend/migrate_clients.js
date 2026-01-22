const db = require('./db');

async function migrateClients() {
    console.log("Starting migration of mislocated clients...");

    // Find users who should be clients
    db.query("SELECT * FROM usuarios WHERE rol = 'Cliente'", (err, users) => {
        if (err) {
            console.error("Error searching usuarios:", err);
            process.exit(1);
        }

        if (users.length === 0) {
            console.log("No clients found in usuarios table to migrate.");
            process.exit(0);
        }

        console.log(`Found ${users.length} clients in usuarios table. Moving them...`);

        // Process each user
        let processed = 0;
        users.forEach(user => {
            // Check if email already exists in clients
            db.query("SELECT id FROM clientes WHERE email = ?", [user.email], (err, existing) => {
                if (existing.length > 0) {
                    console.log(`Client ${user.email} already exists in clientes. Deleting from usuarios...`);
                    deleteFromUsuarios(user.id, () => checkDone(users.length, ++processed));
                } else {
                    // Insert into clientes
                    console.log(`Moving ${user.email} to clientes...`);
                    const insertSql = "INSERT INTO clientes (nombre, apellido, email, password, activo) VALUES (?, ?, ?, ?, ?)";
                    db.query(insertSql, [user.nombre, user.apellido, user.email, user.password, user.activo], (err) => {
                        if (err) console.error(`Error inserting ${user.email}:`, err);
                        else {
                            deleteFromUsuarios(user.id, () => checkDone(users.length, ++processed));
                        }
                    });
                }
            });
        });
    });
}

function deleteFromUsuarios(id, callback) {
    db.query("DELETE FROM usuarios WHERE id = ?", [id], (err) => {
        if (err) console.error(`Error deleting user ${id} from usuarios:`, err);
        else console.log(`Deleted user ${id} from usuarios.`);
        callback();
    });
}

function checkDone(total, current) {
    if (current >= total) {
        console.log("Migration complete.");
        process.exit(0);
    }
}

migrateClients();

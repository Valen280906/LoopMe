const path = require('path');
require('dotenv').config({ path: 'c:/Users/ASUS/Downloads/LoopMe/backend/.env' });
const mysql = require('mysql2');

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const sql = `ALTER TABLE productos 
             MODIFY COLUMN nombre VARCHAR(255) NOT NULL, 
             MODIFY COLUMN talla VARCHAR(100) NULL, 
             MODIFY COLUMN color VARCHAR(150) NULL;`;

conn.query(sql, (err, rows) => {
    if (err) {
        console.error('Error updating schema:', err);
        process.exit(1);
    } else {
        console.log('SCHEMA UPDATED SUCCESSFULLY');
        process.exit(0);
    }
});

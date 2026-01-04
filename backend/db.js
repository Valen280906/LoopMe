const mysql = require("mysql2");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "perla1505",
    database: "loopme"
});

db.getConnection((err)=>{
    if(err){
        console.log("Error conectando a MySQL");
        console.log(err);
    }else{
        console.log("Conectado a MySQL correctamente");
    }
});

module.exports = db;

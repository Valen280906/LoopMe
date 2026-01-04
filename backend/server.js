const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>{
    res.send("Servidor LoopMe funcionando");
});


app.use("/api/auth", require("./routes/auth"));
app.use("/api/secure", require("./routes/secure"));

app.listen(3000, ()=>{
    console.log("Backend corriendo en puerto 3000");
});

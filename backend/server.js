const express = require("express");
const cors = require("cors");
const db = require("./db");
const authMiddleware = require("./middleware/auth");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>{
    res.send("Servidor LoopMe funcionando");
});


app.use("/api/auth", require("./routes/auth")); // login libre

// todo lo que requiere token:
app.use("/api/secure", authMiddleware, require("./routes/secure"));
app.use("/api/users", authMiddleware, require("./routes/users"));

app.listen(3000, ()=>{
    console.log("Backend corriendo en puerto 3000");
});

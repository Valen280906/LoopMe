const jwt = require("jsonwebtoken");
const SECRET = "LOOPME_SUPER_SECRET";

function authMiddleware(req, res, next){
    const token = req.headers["authorization"];

    if(!token){
        return res.json({ success:false, message:"Token requerido" });
    }

    try{
        const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET);
        req.user = decoded;
        next();
    }catch{
        return res.json({ success:false, message:"Token inválido o expirado" });
    }
}

module.exports = authMiddleware;

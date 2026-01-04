const jwt = require("jsonwebtoken");
const SECRET = "LOOPME_SUPER_SECRET";

function authMiddleware(req, res, next){

    const authHeader = req.headers["authorization"];

    if(!authHeader){
        return res.status(401).json({
            success:false,
            message:"Token requerido"
        });
    }

    const token = authHeader.split(" ")[1]; // Bearer TOKEN

    if(!token){
        return res.status(401).json({
            success:false,
            message:"Token inválido"
        });
    }

    try{
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();

    }catch{
        return res.status(401).json({
            success:false,
            message:"Token inválido o expirado"
        });
    }
}

module.exports = authMiddleware;

const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "LOOPME_SUPER_SECRET";

function clienteAuth(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Token requerido"
        });
    }

    const token = authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Token inválido"
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        
        // Verificar que sea un token de cliente
        if (decoded.tipo !== "cliente") {
            return res.status(403).json({
                success: false,
                message: "Acceso no autorizado para clientes"
            });
        }
        
        req.cliente = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token inválido o expirado"
        });
    }
}

module.exports = clienteAuth;
function isVendedor(req, res, next) {
    if(req.user.rol !== "Vendedor" && req.user.rol !== "Administrador"){
        return res.status(403).json({
            success: false,
            message: "Acceso denegado. Solo Vendedor o Administrador."
        });
    }
    next();
}

module.exports = isVendedor;
function isInventario(req, res, next) {
    if(req.user.rol !== "Inventario" && req.user.rol !== "Administrador"){
        return res.status(403).json({
            success: false,
            message: "Acceso denegado. Solo Inventario o Administrador."
        });
    }
    next();
}

module.exports = isInventario;
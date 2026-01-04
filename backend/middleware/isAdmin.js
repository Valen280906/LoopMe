function isAdmin(req, res, next){
    if(req.user.rol !== "Administrador"){
        return res.json({
            success:false,
            message:"Acceso denegado. Solo Administrador."
        });
    }
    next();
}

module.exports = isAdmin;

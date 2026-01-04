const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

router.get("/check", auth, (req,res)=>{
    res.json({
        success:true,
        message:"Acceso permitido",
        user: req.user
    });
});

module.exports = router;

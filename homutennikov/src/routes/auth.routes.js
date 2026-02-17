const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/auth.controller");

router.get("/login", authCtrl.loginForm);
router.post("/login", authCtrl.login);
router.get("/register", authCtrl.registerForm);
router.post("/register", authCtrl.register);
router.post("/logout", authCtrl.logout);

module.exports = router;

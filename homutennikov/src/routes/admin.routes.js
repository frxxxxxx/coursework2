const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/guards");
const adminCtrl = require("../controllers/admin.controller");

router.get("/", requireAuth, requireAdmin, adminCtrl.index);

router.get("/users", requireAuth, requireAdmin, adminCtrl.users);
router.put("/users/:id/role", requireAuth, requireAdmin, adminCtrl.setRole);
router.delete("/users/:id", requireAuth, requireAdmin, adminCtrl.deleteUser);

router.get("/posts", requireAuth, requireAdmin, adminCtrl.posts);
router.put("/posts/:id/status", requireAuth, requireAdmin, adminCtrl.setPostStatus);
router.delete("/posts/:id", requireAuth, requireAdmin, adminCtrl.deletePost);

module.exports = router;

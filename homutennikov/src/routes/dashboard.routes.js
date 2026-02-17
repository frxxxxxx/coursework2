const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/guards");
const { upload } = require("../middleware/upload");
const dashCtrl = require("../controllers/dashboard.controller");

router.get("/", requireAuth, dashCtrl.index);

router.get("/posts/new", requireAuth, dashCtrl.newPostForm);
router.post("/posts", requireAuth, upload.single("cover"), dashCtrl.createPost);

router.get("/posts/:id/edit", requireAuth, dashCtrl.editPostForm);
router.put("/posts/:id", requireAuth, upload.single("cover"), dashCtrl.updatePost);
router.delete("/posts/:id", requireAuth, dashCtrl.deletePost);

router.get("/profile", requireAuth, dashCtrl.profileForm);
router.put("/profile", requireAuth, upload.single("avatar"), dashCtrl.updateProfile);

module.exports = router;

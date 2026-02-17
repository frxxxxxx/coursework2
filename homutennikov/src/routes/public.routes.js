const express = require("express");
const router = express.Router();
const publicCtrl = require("../controllers/public.controller");

router.get("/", publicCtrl.home);
router.get("/feed", publicCtrl.feed);
router.get("/tags/:slug", publicCtrl.byTag);
router.get("/authors/:id", publicCtrl.byAuthor);
router.get("/post/:slug", publicCtrl.post);
router.get("/liked", publicCtrl.liked);
router.post("/post/:id/comments", publicCtrl.addComment);
router.post("/post/:id/like", publicCtrl.toggleLike);

module.exports = router;

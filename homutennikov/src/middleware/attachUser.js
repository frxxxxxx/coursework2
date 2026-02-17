const db = require("../db/db");

async function attachUser(req, res, next) {
  res.locals.flash = {
    success: req.flash("success"),
    error: req.flash("error"),
  };

  res.locals.currentUser = null;

  if (req.session && req.session.userId) {
    try {
      const [rows] = await db.query(
        "SELECT id, role, name, email, bio, avatar_url FROM users WHERE id=? LIMIT 1",
        [req.session.userId]
      );
      if (rows[0]) res.locals.currentUser = rows[0];
    } catch (e) {
      console.error("attachUser:", e.message);
    }
  }

  res.locals.page = {
    title: "PulseBlog",
    description: "Лаконичная блог-платформа с редактором, тегами, лайками и админкой.",
  };

  next();
}

module.exports = { attachUser };

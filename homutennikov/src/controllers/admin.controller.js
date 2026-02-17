const db = require("../db/db");

async function index(req, res, next) {
  try {
    const [[{ users }]] = await db.query("SELECT COUNT(*) as users FROM users");
    const [[{ posts }]] = await db.query("SELECT COUNT(*) as posts FROM posts");
    const [[{ comments }]] = await db.query("SELECT COUNT(*) as comments FROM comments");
    const [[{ likes }]] = await db.query("SELECT COUNT(*) as likes FROM post_likes");

    const [latest] = await db.query(
      `SELECT p.id, p.title, p.slug, p.status, p.created_at, u.name as author_name
       FROM posts p JOIN users u ON u.id=p.user_id
       ORDER BY p.created_at DESC LIMIT 8`
    );

    res.render("admin/index", { stats: { users, posts, comments, likes }, latest });
  } catch (e) { next(e); }
}

async function users(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.role, u.name, u.email, u.created_at,
              (SELECT COUNT(*) FROM posts p WHERE p.user_id=u.id) as posts_count
       FROM users u
       ORDER BY u.created_at DESC`
    );
    res.render("admin/users", { users: rows });
  } catch (e) { next(e); }
}

async function setRole(req, res, next) {
  try {
    const id = Number(req.params.id);
    const role = (req.body.role === "admin") ? "admin" : "author";
    await db.query("UPDATE users SET role=? WHERE id=?", [role, id]);
    req.flash("success", "Роль обновлена.");
    res.redirect("/admin/users");
  } catch (e) { next(e); }
}

async function deleteUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    await db.query("DELETE FROM users WHERE id=? AND role<>'admin'", [id]);
    req.flash("success", "Пользователь удалён (если это не admin).");
    res.redirect("/admin/users");
  } catch (e) { next(e); }
}

async function posts(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.title, p.slug, p.status, p.published_at, p.created_at,
              u.name as author_name
       FROM posts p JOIN users u ON u.id=p.user_id
       ORDER BY p.created_at DESC`
    );
    res.render("admin/posts", { posts: rows });
  } catch (e) { next(e); }
}

async function setPostStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const status = (req.body.status === "draft") ? "draft" : "published";
    const published_at = status === "published" ? new Date() : null;
    await db.query("UPDATE posts SET status=?, published_at=?, updated_at=NOW() WHERE id=?", [status, published_at, id]);
    req.flash("success", "Статус обновлён.");
    res.redirect("/admin/posts");
  } catch (e) { next(e); }
}

async function deletePost(req, res, next) {
  try {
    const id = Number(req.params.id);
    await db.query("DELETE FROM posts WHERE id=?", [id]);
    req.flash("success", "Пост удалён.");
    res.redirect("/admin/posts");
  } catch (e) { next(e); }
}

module.exports = { index, users, setRole, deleteUser, posts, setPostStatus, deletePost };

const db = require("../db/db");
const { slugify } = require("../utils/slugify");

async function index(req, res, next) {
  try {
    const me = res.locals.currentUser;
    const [posts] = await db.query(
      `SELECT id, title, slug, status, published_at, created_at
       FROM posts WHERE user_id=? ORDER BY created_at DESC`,
      [me.id]
    );

    res.render("dashboard/index", { posts });
  } catch (e) { next(e); }
}

async function newPostForm(req, res, next) {
  try {
    const [tags] = await db.query("SELECT id, name FROM tags ORDER BY name ASC");
    res.render("dashboard/post_new", { tags });
  } catch (e) { next(e); }
}

async function createPost(req, res, next) {
  try {
    const me = res.locals.currentUser;
    const title = String(req.body.title || "").trim().slice(0, 220);
    const excerpt = String(req.body.excerpt || "").trim().slice(0, 320) || null;
    const content = String(req.body.content || "").trim();
    const status = (req.body.status === "draft") ? "draft" : "published";
    const tags = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? [req.body.tags] : []);
    const cover_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!title || !content) {
      req.flash("error", "У поста должны быть заголовок и текст.");
      return res.redirect("/dashboard/posts/new");
    }

    const slug = slugify(`${me.id}-${Date.now()}-${title}`);
    const published_at = status === "published" ? new Date() : null;

    const [ins] = await db.query(
      `INSERT INTO posts (user_id, title, slug, excerpt, content, cover_url, status, published_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [me.id, title, slug, excerpt, content, cover_url, status, published_at]
    );

    const postId = ins.insertId;
    for (const t of tags.map(Number).filter(Boolean)) {
      await db.query("INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?,?)", [postId, t]);
    }

    req.flash("success", "Пост создан.");
    res.redirect("/dashboard");
  } catch (e) { next(e); }
}

async function editPostForm(req, res, next) {
  try {
    const me = res.locals.currentUser;
    const id = Number(req.params.id);

    const [[post]] = await db.query(
      "SELECT * FROM posts WHERE id=? AND user_id=? LIMIT 1",
      [id, me.id]
    );
    if (!post) {
      req.flash("error", "Пост не найден.");
      return res.redirect("/dashboard");
    }

    const [tags] = await db.query("SELECT id, name FROM tags ORDER BY name ASC");
    const [selected] = await db.query("SELECT tag_id FROM post_tags WHERE post_id=?", [id]);
    const selectedSet = new Set(selected.map(r => r.tag_id));

    res.render("dashboard/post_edit", { post, tags, selectedSet });
  } catch (e) { next(e); }
}

async function updatePost(req, res, next) {
  try {
    const me = res.locals.currentUser;
    const id = Number(req.params.id);

    const [[post]] = await db.query(
      "SELECT id, cover_url FROM posts WHERE id=? AND user_id=? LIMIT 1",
      [id, me.id]
    );
    if (!post) {
      req.flash("error", "Пост не найден.");
      return res.redirect("/dashboard");
    }

    const title = String(req.body.title || "").trim().slice(0, 220);
    const excerpt = String(req.body.excerpt || "").trim().slice(0, 320) || null;
    const content = String(req.body.content || "").trim();
    const status = (req.body.status === "draft") ? "draft" : "published";
    const tags = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? [req.body.tags] : []);
    const cover_url = req.file ? `/uploads/${req.file.filename}` : post.cover_url;
    const published_at = status === "published" ? (req.body.published_at || new Date()) : null;

    if (!title || !content) {
      req.flash("error", "У поста должны быть заголовок и текст.");
      return res.redirect(`/dashboard/posts/${id}/edit`);
    }

    await db.query(
      `UPDATE posts SET title=?, excerpt=?, content=?, cover_url=?, status=?, published_at=?, updated_at=NOW()
       WHERE id=? AND user_id=?`,
      [title, excerpt, content, cover_url, status, published_at, id, me.id]
    );

    await db.query("DELETE FROM post_tags WHERE post_id=?", [id]);
    for (const t of tags.map(Number).filter(Boolean)) {
      await db.query("INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?,?)", [id, t]);
    }

    req.flash("success", "Изменения сохранены.");
    res.redirect("/dashboard");
  } catch (e) { next(e); }
}

async function deletePost(req, res, next) {
  try {
    const me = res.locals.currentUser;
    const id = Number(req.params.id);
    await db.query("DELETE FROM posts WHERE id=? AND user_id=?", [id, me.id]);
    req.flash("success", "Пост удалён.");
    res.redirect("/dashboard");
  } catch (e) { next(e); }
}

async function profileForm(req, res) {
  res.render("dashboard/profile");
}

async function updateProfile(req, res, next) {
  try {
    const me = res.locals.currentUser;
    const name = String(req.body.name || "").trim().slice(0, 120);
    const bio = String(req.body.bio || "").trim().slice(0, 500) || null;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : me.avatar_url;

    if (!name) {
      req.flash("error", "Имя не может быть пустым.");
      return res.redirect("/dashboard/profile");
    }

    await db.query("UPDATE users SET name=?, bio=?, avatar_url=? WHERE id=?", [name, bio, avatar_url, me.id]);
    req.flash("success", "Профиль обновлён.");
    res.redirect("/dashboard/profile");
  } catch (e) { next(e); }
}

module.exports = {
  index,
  newPostForm, createPost,
  editPostForm, updatePost, deletePost,
  profileForm, updateProfile
};

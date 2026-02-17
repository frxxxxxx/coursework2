const db = require("../db/db");
const { render } = require("../utils/markdownLite");

function safeReturnTo(req, fallback = "/feed") {
  const raw = (req.body && req.body.returnTo) || req.get("referer") || "";
  // Разрешаем только относительные URL внутри сайта, чтобы исключить open-redirect.
  if (typeof raw === "string" && raw.startsWith("/")) return raw;
  return fallback;
}

async function home(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = 8;
    const offset = (page - 1) * limit;

    const [posts] = await db.query(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.cover_url, p.published_at,
              u.id as author_id, u.name as author_name,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) as comments_count,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id=p.id) as likes_count
       FROM posts p
       JOIN users u ON u.id=p.user_id
       WHERE p.status='published'
       ORDER BY p.published_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) as total FROM posts WHERE status='published'"
    );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const [tags] = await db.query(
      `SELECT t.name, t.slug, COUNT(pt.post_id) as cnt
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id=t.id
       GROUP BY t.id
       ORDER BY cnt DESC, t.name ASC
       LIMIT 12`
    );

    res.render("public/home", { posts, tags, page, totalPages });
  } catch (e) { next(e); }
}

async function feed(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    const tag = String(req.query.tag || "").trim();
    const where = [];
    const params = [];

    where.push("p.status='published'");

    if (q) {
      where.push("(p.title LIKE ? OR p.content LIKE ? OR u.name LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (tag) {
      where.push("EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id=pt.tag_id WHERE pt.post_id=p.id AND t.slug=?)");
      params.push(tag);
    }

    const [posts] = await db.query(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.cover_url, p.published_at,
              u.id as author_id, u.name as author_name
       FROM posts p
       JOIN users u ON u.id=p.user_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.published_at DESC
       LIMIT 30`,
      params
    );

    const [tags] = await db.query("SELECT name, slug FROM tags ORDER BY name ASC");

    res.render("public/feed", { posts, tags, q, tag });
  } catch (e) { next(e); }
}

async function byTag(req, res, next) {
  try {
    const slug = req.params.slug;
    const [[tagRow]] = await db.query("SELECT id, name, slug FROM tags WHERE slug=? LIMIT 1", [slug]);
    if (!tagRow) return res.status(404).render("errors/404", { url: req.originalUrl });

    const [posts] = await db.query(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.cover_url, p.published_at,
              u.id as author_id, u.name as author_name
       FROM posts p
       JOIN users u ON u.id=p.user_id
       JOIN post_tags pt ON pt.post_id=p.id
       WHERE p.status='published' AND pt.tag_id=?
       ORDER BY p.published_at DESC
       LIMIT 40`,
      [tagRow.id]
    );

    res.render("public/tag", { tag: tagRow, posts });
  } catch (e) { next(e); }
}

async function byAuthor(req, res, next) {
  try {
    const id = Number(req.params.id);
    const [[author]] = await db.query("SELECT id, name, bio, avatar_url FROM users WHERE id=? LIMIT 1", [id]);
    if (!author) return res.status(404).render("errors/404", { url: req.originalUrl });

    const [posts] = await db.query(
      `SELECT id, title, slug, excerpt, cover_url, published_at
       FROM posts
       WHERE user_id=? AND status='published'
       ORDER BY published_at DESC
       LIMIT 40`,
      [id]
    );

    res.render("public/author", { author, posts });
  } catch (e) { next(e); }
}

async function post(req, res, next) {
  try {
    const slug = req.params.slug;

    const [[p]] = await db.query(
      `SELECT p.*, u.name as author_name, u.id as author_id, u.avatar_url as author_avatar
       FROM posts p
       JOIN users u ON u.id=p.user_id
       WHERE p.slug=? AND p.status='published' LIMIT 1`,
      [slug]
    );

    if (!p) return res.status(404).render("errors/404", { url: req.originalUrl });

    const [tags] = await db.query(
      `SELECT t.name, t.slug
       FROM tags t
       JOIN post_tags pt ON pt.tag_id=t.id
       WHERE pt.post_id=?
       ORDER BY t.name ASC`,
      [p.id]
    );

    const [comments] = await db.query(
      `SELECT c.id, c.body, c.created_at,
              u.id as user_id, u.name as user_name, u.avatar_url as user_avatar,
              c.author_name, c.author_email
       FROM comments c
       LEFT JOIN users u ON u.id=c.user_id
       WHERE c.post_id=?
       ORDER BY c.created_at ASC`,
      [p.id]
    );

    const [[{ likes_count }]] = await db.query(
      "SELECT COUNT(*) as likes_count FROM post_likes WHERE post_id=?",
      [p.id]
    );

    let likedByMe = false;
    const me = res.locals.currentUser;
    if (me) {
      const [[row]] = await db.query("SELECT 1 as ok FROM post_likes WHERE post_id=? AND user_id=? LIMIT 1", [p.id, me.id]);
      likedByMe = !!row;
    }

    res.render("public/post", {
      post: p,
      tags,
      comments,
      likes_count,
      likedByMe,
      render,
      returnTo: req.originalUrl,
    });
  } catch (e) { next(e); }
}

async function liked(req, res, next) {
  try {
    const me = res.locals.currentUser;
    if (!me) {
      req.flash("error", "Список лайков доступен после входа.");
      return res.redirect("/auth/login");
    }

    const [posts] = await db.query(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.cover_url, p.published_at,
              u.id as author_id, u.name as author_name,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) as comments_count,
              (SELECT COUNT(*) FROM post_likes pl2 WHERE pl2.post_id=p.id) as likes_count
       FROM post_likes pl
       JOIN posts p ON p.id=pl.post_id
       JOIN users u ON u.id=p.user_id
       WHERE pl.user_id=? AND p.status='published'
       ORDER BY pl.created_at DESC
       LIMIT 60`,
      [me.id]
    );

    res.render("public/liked", { posts });
  } catch (e) { next(e); }
}

async function addComment(req, res, next) {
  try {
    const postId = Number(req.params.id);
    const back = safeReturnTo(req, "/feed");
    const body = String(req.body.body || "").trim();
    if (!body) {
      req.flash("error", "Комментарий пустой.");
      return res.redirect(back);
    }

    const me = res.locals.currentUser;
    if (me) {
      await db.query(
        "INSERT INTO comments (post_id, user_id, body) VALUES (?,?,?)",
        [postId, me.id, body]
      );
    } else {
      const author_name = String(req.body.author_name || "Гость").trim().slice(0, 120);
      const author_email = String(req.body.author_email || "").trim().slice(0, 190) || null;
      await db.query(
        "INSERT INTO comments (post_id, user_id, author_name, author_email, body) VALUES (?,?,?,?,?)",
        [postId, null, author_name, author_email, body]
      );
    }

    req.flash("success", "Комментарий добавлен.");
    return res.redirect(back);
  } catch (e) { next(e); }
}

async function toggleLike(req, res, next) {
  try {
    const me = res.locals.currentUser;
    if (!me) {
      req.flash("error", "Лайкать можно только после входа.");
      return res.redirect("/auth/login");
    }

    const postId = Number(req.params.id);
    const back = safeReturnTo(req, "/feed");
    const [[row]] = await db.query("SELECT 1 as ok FROM post_likes WHERE post_id=? AND user_id=? LIMIT 1", [postId, me.id]);
    if (row) {
      await db.query("DELETE FROM post_likes WHERE post_id=? AND user_id=?", [postId, me.id]);
    } else {
      await db.query("INSERT INTO post_likes (post_id, user_id) VALUES (?,?)", [postId, me.id]);
    }
    return res.redirect(back);
  } catch (e) { next(e); }
}

module.exports = { home, feed, byTag, byAuthor, post, liked, addComment, toggleLike };

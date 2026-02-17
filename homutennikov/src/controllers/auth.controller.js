const bcrypt = require("bcryptjs");
const db = require("../db/db");

function loginForm(req, res) {
  res.render("auth/login");
}

async function login(req, res, next) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const [[user]] = await db.query(
      "SELECT id, role, name, email, password_hash FROM users WHERE email=? LIMIT 1",
      [email]
    );

    if (!user) {
      req.flash("error", "Неверная почта или пароль.");
      return res.redirect("/auth/login");
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      req.flash("error", "Неверная почта или пароль.");
      return res.redirect("/auth/login");
    }

    req.session.userId = user.id;
    req.flash("success", `Привет, ${user.name}!`);
    res.redirect(user.role === "admin" ? "/admin" : "/dashboard");
  } catch (e) { next(e); }
}

function registerForm(req, res) {
  res.render("auth/register");
}

async function register(req, res, next) {
  try {
    const name = String(req.body.name || "").trim().slice(0, 120);
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const bio = String(req.body.bio || "").trim().slice(0, 500) || null;

    if (!name || !email || password.length < 6) {
      req.flash("error", "Заполни имя/почту и пароль (минимум 6 символов).");
      return res.redirect("/auth/register");
    }

    const [[exists]] = await db.query("SELECT id FROM users WHERE email=? LIMIT 1", [email]);
    if (exists) {
      req.flash("error", "Почта уже используется.");
      return res.redirect("/auth/register");
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [ins] = await db.query(
      "INSERT INTO users (role, name, email, password_hash, bio) VALUES ('author',?,?,?,?)",
      [name, email, password_hash, bio]
    );

    req.session.userId = ins.insertId;
    req.flash("success", "Аккаунт создан ✅");
    res.redirect("/dashboard");
  } catch (e) { next(e); }
}

function logout(req, res) {
  req.session.destroy(() => res.redirect("/"));
}

module.exports = { loginForm, login, registerForm, register, logout };

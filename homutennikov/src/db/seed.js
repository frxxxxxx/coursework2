require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const db = require("./db");
const { slugify } = require("../utils/slugify");

async function ensureDatabase() {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASS || "";
  const dbName = process.env.DB_NAME || "blog_platform";

  const conn = await mysql.createConnection({ host, port, user, password });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`);
  } finally {
    await conn.end();
  }
}


function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const TAGS = [
  "Жизнь с собакой", "Дрессировка", "Питание", "Путешествия", "Гаджеты",
  "Продуктивность", "Музыка", "Кино", "Фотография", "Дизайн"
];

const THEMES = [
  "Неоновый минимализм", "Городская прогулка", "Дневник наблюдений",
  "Как я решал проблему", "Топ-ошибок новичка", "Короткий гайд"
];

const PARAS = [
  "Иногда самые простые решения оказываются самыми устойчивыми. В этот раз я пошёл от ограничений: меньше зависимостей, больше ясности.",
  'Собака быстро показывает, где у тебя слабые границы и где ты пытаешься "перехитрить" систему. Работает только последовательность.',
  "Я заметил, что в больших задачах спасает ритуал: разложить шаги, выделить риски, выбрать минимальный контрольный результат.",
  "Эта заметка не претендует на истину. Скорее, это аккуратный отчёт о том, что сработало и что не сработало.",
  "Если упростить, то всё сводится к двум вещам: регулярность и обратная связь. Без них прогресса почти не видно."
];

async function main() {
  await ensureDatabase();
  const conn = await db.getConnection();
  try {
    // 1) Схема
    const fs = require("fs");
    const path = require("path");
    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");
    const dbName = process.env.DB_NAME || "blog_platform";
    await conn.query(`USE \`${dbName}\``);

    const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    for (const st of statements) {
      if (/^CREATE\s+DATABASE/i.test(st)) continue;
      if (/^USE\s+/i.test(st)) continue;
      await conn.query(st);
    }

    // 2) Чистим данные
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    for (const t of ["post_likes","comments","post_tags","tags","posts","users"]) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS=1");

    // 3) Теги
    for (const name of TAGS) {
      await conn.query("INSERT INTO tags (name, slug) VALUES (?,?)", [name, slugify(name)]);
    }
    const [tagRows] = await conn.query("SELECT id FROM tags");

    // 4) Пользователи: 10 авторов + 1 админ
    const authors = [];
    const passAuthor = await bcrypt.hash("user12345", 10);
    const passAdmin = await bcrypt.hash("admin12345", 10);

    const admin = {
      role: "admin",
      name: "Admin",
      email: "admin@blog.local",
      password_hash: passAdmin,
      bio: "Администратор. Управляет пользователями и контентом.",
      avatar_url: null
    };

    await conn.query(
      "INSERT INTO users (role, name, email, password_hash, bio, avatar_url) VALUES (?,?,?,?,?,?)",
      [admin.role, admin.name, admin.email, admin.password_hash, admin.bio, admin.avatar_url]
    );

    for (let i = 1; i <= 10; i++) {
      const u = {
        role: "author",
        name: `Автор ${i}`,
        email: `user${i}@blog.local`,
        password_hash: passAuthor,
        bio: `Пишу заметки №${i} про привычки, собак и небольшие эксперименты.`,
        avatar_url: null
      };
      const [res] = await conn.query(
        "INSERT INTO users (role, name, email, password_hash, bio, avatar_url) VALUES (?,?,?,?,?,?)",
        [u.role, u.name, u.email, u.password_hash, u.bio, u.avatar_url]
      );
      u.id = res.insertId;
      authors.push(u);
    }

    // 5) Посты: у каждого автора по 3 поста
    const now = new Date();
    for (const u of authors) {
      for (let k = 1; k <= 3; k++) {
        const title = `${pick(THEMES)}: заметка ${k}`;
        const slug = slugify(`${u.name}-${title}-${u.email}`);
        const excerpt = pick(PARAS).slice(0, 180);
        const content = [
          pick(PARAS),
          "",
          "### Что я сделал",
          "- Разложил задачу на шаги",
          "- Оставил только нужное",
          "- Проверил на мобильном",
          "",
          "### Наблюдение",
          pick(PARAS),
          "",
          "### Итог",
          "Смысл в том, чтобы делать маленькие улучшения, но каждый день."
        ].join("\n");

        const publishedAt = new Date(now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30));
        const [res] = await conn.query(
          `INSERT INTO posts (user_id, title, slug, excerpt, content, cover_url, status, published_at)
           VALUES (?,?,?,?,?,?, 'published', ?)`,
          [u.id, title, slug, excerpt, content, null, publishedAt]
        );
        const postId = res.insertId;

        // Теги 1-3 шт
        const tagCount = 1 + Math.floor(Math.random() * 3);
        const shuffled = tagRows.map(r => r.id).sort(() => Math.random() - 0.5);
        for (const tagId of shuffled.slice(0, tagCount)) {
          await conn.query("INSERT INTO post_tags (post_id, tag_id) VALUES (?,?)", [postId, tagId]);
        }

        // Комментарии 0-4
        const comCount = Math.floor(Math.random() * 5);
        for (let c = 0; c < comCount; c++) {
          const anon = Math.random() < 0.5;
          await conn.query(
            `INSERT INTO comments (post_id, user_id, author_name, author_email, body)
             VALUES (?,?,?,?,?)`,
            [postId, anon ? null : u.id, anon ? "Гость" : null, anon ? "guest@nowhere.local" : null, pick(PARAS)]
          );
        }
      }
    }

    console.log("✅ Seed complete.");
    console.log("");
    console.log("Логины:");
    console.log("  admin@blog.local / admin12345");
    console.log("  user1@blog.local .. user10@blog.local / user12345");
  } finally {
    conn.release();
    await db.end();
  }
}

main().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});

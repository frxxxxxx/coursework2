require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

function splitStatements(sql) {
  return sql
    .replace(/\r\n/g, "\n")
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

async function main() {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASS || "";
  const dbName = process.env.DB_NAME || "blog_platform";

  const conn = await mysql.createConnection({
    host, port, user, password,
    multipleStatements: false,
  });

  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");

    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${dbName}\``);

    const statements = splitStatements(sql);

    for (const st of statements) {
      if (/^CREATE\s+DATABASE/i.test(st)) continue;
      if (/^USE\s+/i.test(st)) continue;
      await conn.query(st);
    }

    console.log("✅ Migration done.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});

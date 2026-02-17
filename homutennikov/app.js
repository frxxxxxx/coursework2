require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const methodOverride = require("method-override");

const { attachUser } = require("./src/middleware/attachUser");
const { notFound, errorHandler } = require("./src/middleware/errors");

const publicRoutes = require("./src/routes/public.routes");
const authRoutes = require("./src/routes/auth.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");
const adminRoutes = require("./src/routes/admin.routes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(methodOverride("_method"));

app.use(session({
  secret: process.env.SESSION_SECRET || "dev_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  }
}));
app.use(flash());

app.use(express.static(path.join(__dirname, "public")));

app.use(attachUser);

app.use("/", publicRoutes);
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    req.flash("error", "Сначала войди в аккаунт.");
    return res.redirect("/auth/login");
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!res.locals.currentUser || res.locals.currentUser.role !== "admin") {
    req.flash("error", "Доступ только для администратора.");
    return res.redirect("/");
  }
  next();
}

module.exports = { requireAuth, requireAdmin };

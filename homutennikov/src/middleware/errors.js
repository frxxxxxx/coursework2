function notFound(req, res) {
  res.status(404).render("errors/404", { url: req.originalUrl });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).render("errors/500", { error: err });
}

module.exports = { notFound, errorHandler };

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Очень лёгкий рендер: заголовки ###, списки -, жирный **, код ``
function render(md) {
  const safe = escapeHtml(md);
  const lines = safe.split(/\r?\n/);

  let html = "";
  let inList = false;

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.*)$/);
    const li = line.match(/^-\s+(.*)$/);
    if (h3) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${inline(h3[1])}</h3>`;
      continue;
    }
    if (li) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(li[1])}</li>`;
      continue;
    }
    if (line.trim() === "") {
      if (inList) { html += "</ul>"; inList = false; }
      html += "<div class=\"md-spacer\"></div>";
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    html += `<p>${inline(line)}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

function inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

module.exports = { render };

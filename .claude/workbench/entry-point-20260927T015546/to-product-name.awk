# Convierte la cadena que contiene «Claude Code» en template literal con
# ${PRODUCT_NAME}. Salta comentarios. Si ya es backtick, sólo sustituye.
function lastq(s, pos,   i, c) { for (i = pos - 1; i > 0; i--) { c = substr(s, i, 1); if (c == "'" || c == "\"" || c == "`") return i } return 0 }
function nextq(s, pos, q,   i) { for (i = pos; i <= length(s); i++) if (substr(s, i, 1) == q && substr(s, i - 1, 1) != "\\") return i; return 0 }
{
  if ($0 ~ /^[ \t]*(\/\/|\*|\/\*)/ || index($0, "Claude Code") == 0) { print; next }
  line = $0
  while ((p = index(line, "Claude Code")) > 0) {
    a = lastq(line, p); q = substr(line, a, 1)
    if (q != "`") { b = nextq(line, p, q); line = substr(line, 1, a - 1) "`" substr(line, a + 1, b - a - 1) "`" substr(line, b + 1); changed = 1 }
    p = index(line, "Claude Code")
    line = substr(line, 1, p - 1) "${PRODUCT_NAME}" substr(line, p + 11)
  }
  print line
}

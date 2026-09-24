# Entrada: definidos-por-paquete.tsv (clase, símbolo, destino, fuente).
# Salida: destino <TAB> símbolo <TAB> ruta relativa .js <TAB> valor|tipo
BEGIN { FS = OFS = "\t" }
$1 != "mismo-paquete" { next }
{
  dest = $3; sym = $2; src = $4
  kind = "valor"
  cmd = "rg -m1 --no-ignore -e \"^\\\\s*export\\\\s+(declare\\\\s+)?(type|interface)\\\\s+" sym "\\\\b\" " src
  if ((cmd | getline line) > 0) kind = "tipo"
  close(cmd)
  # ruta relativa del destino a la fuente, con .js
  n = split(dest, d, "/"); m = split(src, s, "/")
  i = 1; while (i < n && i < m && d[i] == s[i]) i++
  rel = ""; for (k = i; k < n; k++) rel = rel "../"
  if (rel == "") rel = "./"
  for (k = i; k < m; k++) rel = rel s[k] "/"
  file = s[m]; sub(/\.(ts|tsx)$/, ".js", file)
  print dest, sym, rel file, kind
}

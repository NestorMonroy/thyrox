# Clasifica cada import por nombre contra el exports del paquete destino.
#   puerta     -> '@x/y' (la clave ".")
#   explicita  -> subruta declarada como clave sin comodín
#   comodin    -> subruta que sólo entra por './*' / './*.js'
# Primera entrada: claves-explicitas.tsv; segunda: especificadores.tsv.
BEGIN { FS = OFS = "\t" }
NR == FNR { key[$1 SUBSEP $2] = 1; pkgs[$1] = 1; next }
{
  spec = $2
  n = split(spec, p, "/")
  pkg = p[1] "/" p[2]
  if (!(pkg in pkgs)) { externo++; next }
  if ($1 ~ ("/" p[2] "/$")) { propio++; next }
  if (n == 2) { clase = "puerta" }
  else {
    sub_ = "./" substr(spec, length(pkg) + 2)
    clase = ((pkg SUBSEP sub_) in key) ? "explicita" : "comodin"
  }
  total[clase]++; porpkg[pkg, clase]++; destinos[pkg] = 1
  if (clase == "comodin") distintas[pkg, sub_] = 1
}
END {
  print "clase", "imports"
  for (c in total) print c, total[c]
  print "externo(no-@thyrox local)", externo + 0; print "autoimport", propio + 0
  print ""
  print "destino", "puerta", "explicita", "comodin", "subrutas-comodin"
  for (k in distintas) { split(k, a, SUBSEP); nd[a[1]]++ }
  for (d in destinos) print d, porpkg[d, "puerta"] + 0, porpkg[d, "explicita"] + 0, porpkg[d, "comodin"] + 0, nd[d] + 0 | "sort -t\"\t\" -k4,4nr"
}

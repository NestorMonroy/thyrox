# Resuelve los cinco bloques en conflicto de headless-pool.sh entre 0496 (ours)
# y C6 (theirs). Cada bloque se reemplaza por su resolución declarada abajo.
/^<<<<<<< ours$/ { hunk++; side = "ours"; ours = ""; theirs = ""; next }
/^=======$/ && side == "ours" { side = "theirs"; next }
/^>>>>>>> theirs$/ {
  if (hunk == 1) {
    print "#                    [--credential-proxy | --store-credential-proxy]"
    print "#                    [--credential-source inherit|proxy-env|proxy-store|proxy-store-url]"
  } else if (hunk == 2) {
    print "TIMEOUT=600; TOOLS=\"Read\"; TOOLS_SET=\"\"; ISOLATION=\"\"; VERIFY=\"\"; MAX_TURNS=\"\"; WORKDIR=\"$PWD\"; MEMFREE_SPEC=\"\"; CACHE_TTL=\"\"; CREDENTIAL_PROXY=\"\"; STORE_CREDENTIAL_PROXY=\"\"; CREDENTIAL_SOURCE=\"\""
  } else if (hunk == 3) {
    printf "%s%s", ours, theirs
  } else if (hunk == 4) {
    # Los helpers de ours sin su comentario final, que theirs repite ampliado.
    n = split(ours, lines, "\n")
    for (i = 1; i <= n - 3; i++) print lines[i]
    printf "%s", theirs
  } else if (hunk == 5) {
    print "<<HUNK5>>"
  }
  side = ""; next
}
side == "ours" { ours = ours $0 "\n"; next }
side == "theirs" { theirs = theirs $0 "\n"; next }
{ print }

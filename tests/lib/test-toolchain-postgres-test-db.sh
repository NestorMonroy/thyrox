#!/usr/bin/env bash
# test-toolchain-postgres-test-db.sh — contrato de la base PostgreSQL de pruebas.
#
# No instala el servidor: provisiona un rol y una base desechables sobre el
# clúster que ya existe, y deja THYROX_TEST_POSTGRES_URL apuntando a ellos.
# Mismo contrato que sus hermanos: provisionar es opt-in
# (THYROX_INSTALL_POSTGRES_TEST_DB=1), el rechazo no emite conteo y el éxito se
# RE-COMPRUEBA conectando, no se lee del exit del administrador. El caso que
# discrimina es el 6: un administrador que sale 0 sin crear nada.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

if type thyrox_toolchain_require_postgres_test_db &>/dev/null; then
  ok "la adquisicion existe"
else
  bad "falta thyrox_toolchain_require_postgres_test_db en $SUBJECT"
  thyrox_summary; exit 1
fi

WORK="$(mktemp -d)"; trap 'rm -rf "${WORK:?}"' EXIT
STATE="$WORK/provisioned-url"
# Un psql falso: conecta sólo a la URL que el administrador dejó provisionada,
# y a esa le concede CREATE sobre la base.
cat > "$WORK/psql" <<STUB
#!/usr/bin/env bash
url="\$1"
[[ -f "$STATE" && "\$url" == "\$(cat "$STATE")" ]] || { echo "psql: connection refused" >&2; exit 2; }
echo t
STUB
chmod +x "$WORK/psql"
export THYROX_TOOLCHAIN_PSQL_BIN="$WORK/psql"

# Un administrador falso: lee el SQL por stdin, lo guarda, y deja provisionada
# la URL que ese SQL declara (rol y contraseña) — como haría el real.
cat > "$WORK/admin" <<STUB
#!/usr/bin/env bash
sql="\$(cat)"; printf '%s\n' "\$sql" > "$WORK/admin.sql"
pw="\$(printf '%s\n' "\$sql" | sed -n "s/.*PASSWORD '\\([0-9a-f]*\\)'.*/\\1/p" | head -n 1)"
printf 'postgres://thyrox_test:%s@127.0.0.1:5432/thyrox_test\n' "\$pw" > "$STATE"
STUB
chmod +x "$WORK/admin"
# Un administrador que MIENTE: sale 0 sin crear nada.
printf '#!/usr/bin/env bash\ncat >/dev/null\nexit 0\n' > "$WORK/lying-admin"; chmod +x "$WORK/lying-admin"

# Caso 2 — sin URL declarada ni opt-in: REHUSA con exit 2, nombra la variable, sin conteo.
out="$(THYROX_TEST_POSTGRES_URL='' THYROX_INSTALL_POSTGRES_TEST_DB='' \
       thyrox_toolchain_require_postgres_test_db 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *THYROX_INSTALL_POSTGRES_TEST_DB* ]]; then ok "sin opt-in rehusa nombrando THYROX_INSTALL_POSTGRES_TEST_DB"
else bad "sin opt-in esperaba exit 2 nombrando la variable, dio $rc: '$out'"; fi

# Caso 3 — opt-in: provisiona, re-comprueba conectando y exporta la URL.
out="$( (THYROX_TEST_POSTGRES_URL='' THYROX_INSTALL_POSTGRES_TEST_DB=1 \
         THYROX_TOOLCHAIN_POSTGRES_ADMIN_CMD="$WORK/admin" \
         thyrox_toolchain_require_postgres_test_db && printf 'EXPORTED=%s\n' "$THYROX_TEST_POSTGRES_URL") 2>/dev/null)"; rc=$?
if [[ $rc -eq 0 ]]; then ok "con opt-in provisiona y sale 0"
else bad "con opt-in esperaba exit 0, dio $rc: '$out'"; fi
if [[ "$out" == *"EXPORTED=$(cat "$STATE" 2>/dev/null)"* && -s "$STATE" ]]; then ok "exporta THYROX_TEST_POSTGRES_URL con la URL provisionada"
else bad "no exporta la URL provisionada: '$out'"; fi
if [[ "$out" == *"THYROX_TEST_POSTGRES_URL=postgres://thyrox_test:"* ]]; then ok "imprime la línea para el .env por stdout"
else bad "no imprime THYROX_TEST_POSTGRES_URL=… por stdout: '$out'"; fi

# Caso 4 — el SQL es idempotente: el rol se crea O se altera, la base sólo si falta.
sql="$(cat "$WORK/admin.sql" 2>/dev/null)"
if [[ "$sql" == *"ALTER ROLE thyrox_test"* && "$sql" == *"CREATE ROLE thyrox_test"* && "$sql" == *"NOT EXISTS"* && "$sql" == *'\gexec'* ]]; then
  ok "el SQL crea o altera el rol y crea la base sólo si falta"
else bad "el SQL no es idempotente: '$sql'"; fi

# Caso 5 — una URL ya declarada que conecta: sale 0 sin tocar el administrador.
rm -f "${WORK:?}/admin.sql"
out="$(THYROX_TEST_POSTGRES_URL="$(cat "$STATE")" THYROX_INSTALL_POSTGRES_TEST_DB='' \
       THYROX_TOOLCHAIN_POSTGRES_ADMIN_CMD="$WORK/admin" \
       thyrox_toolchain_require_postgres_test_db 2>&1)"; rc=$?
if [[ $rc -eq 0 && ! -e "$WORK/admin.sql" ]]; then ok "una URL declarada que conecta se usa sin provisionar"
else bad "esperaba exit 0 sin provisionar, dio $rc (admin.sql: $(test -e "$WORK/admin.sql" && echo si || echo no))"; fi

# Caso 6 — DISCRIMINA: un administrador que sale 0 sin crear nada. Se re-comprueba conectando.
rm -f "${STATE:?}"
out="$(THYROX_TEST_POSTGRES_URL='' THYROX_INSTALL_POSTGRES_TEST_DB=1 \
       THYROX_TOOLCHAIN_POSTGRES_ADMIN_CMD="$WORK/lying-admin" \
       thyrox_toolchain_require_postgres_test_db 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "un administrador que miente no produce éxito: re-comprueba conectando"
else bad "el administrador mentiroso dio exit $rc; se leyó su exit en vez de conectar: '$out'"; fi

# Caso 7 — una URL declarada que NO conecta: rehúsa sin provisionar encima.
out="$(THYROX_TEST_POSTGRES_URL='postgres://otro:x@127.0.0.1:5432/otra' THYROX_INSTALL_POSTGRES_TEST_DB=1 \
       THYROX_TOOLCHAIN_POSTGRES_ADMIN_CMD="$WORK/admin" \
       thyrox_toolchain_require_postgres_test_db 2>&1)"; rc=$?
if [[ $rc -eq 2 && ! -e "$WORK/admin.sql" ]]; then ok "una URL declarada que no conecta rehúsa sin provisionar encima"
else bad "esperaba exit 2 sin provisionar sobre la URL declarada, dio $rc"; fi
if [[ "$out" != *":x@"* ]]; then ok "el rechazo no imprime la contraseña de la URL declarada"
else bad "el rechazo filtró la contraseña: '$out'"; fi

thyrox_summary

#!/usr/bin/env bash
# Suite de la fuente de credencial de headless-pool (TASK-THYROX-0499): el
# pool decide ANTES de lanzar ningún ítem entre `inherit` (cada ítem hereda el
# entorno del pool; sin credencial, `thyrox -p` delega en `claude -p`),
# `proxy-env` (el proxy con la credencial del entorno del pool) y
# `proxy-store` (el proxy con la conexión del store, sin credencial del
# entorno), declara cuál usó y por qué, y rehúsa con exit 2 cuando la fuente
# pedida no está en vez de caer a otra.
#
# Ni el proxy ni el runner reales se invocan: HEADLESS_POOL_CREDENTIAL_PROXY
# y HEADLESS_POOL_RUNNER apuntan a dobles que registran sólo los NOMBRES de
# las variables de credencial que vieron, nunca su valor. Lo que se mide es
# la decisión y lo que llega a cada lado; el servicio no entra.
#
# Métrica: la línea `credencial:` del pool, el archivo `credential-source` de
# la salida, los nombres de variable que vieron el proxy y el ítem, el código
# de salida y la presencia del resumen.
# Ciega a: si el proxy real resuelve la conexión del store (lo mide
# `tests/session/test-headless-pool-thyrox-p.sh` con el proxy real) y a si el
# ítem con máscara encuentra `claude` en el PATH (lo decide `thyrox -p`).
set -uo pipefail
# Esta suite mide la mecánica del pool, no la política de ejecución: la declara
# sin restricción (sin ella regiría la versionada del árbol, que no admite respaldo).
THYROX_EXECUTION_POLICY="$(cd "$(dirname "${BASH_SOURCE[0]}")/../fixtures" && pwd)/execution_policy_unrestricted.json"
export THYROX_EXECUTION_POLICY
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
POOL="$ROOT/src/session/headless-pool.sh"
failures=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; failures=$((failures+1)); fi; }

F="$(mktemp -d)"; trap 'rm -rf "${F:?}"' EXIT
export THYROX_RUNTIME_DIR="$F/runtime"
CREDENTIAL_NAMES=(ANTHROPIC_AUTH_TOKEN THYROX_CODE_OAUTH_TOKEN THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ANTHROPIC_API_KEY)
# Un valor que ningún artefacto puede contener: si aparece, se filtró.
SECRET="sk-secret-9f3a7c"

# Los dobles comparten la sonda: los nombres presentes, en el orden de la
# cadena, o `none`.
cat > "$F/present-names.sh" <<'PROBE'
present_names() {
  local name out=""
  for name in ANTHROPIC_AUTH_TOKEN THYROX_CODE_OAUTH_TOKEN THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ANTHROPIC_API_KEY; do
    [[ -n "${!name:-}" ]] && out="${out:+$out,}$name"
  done
  echo "${out:-none}"
}
PROBE
# El proxy doble: anota los nombres que vio y su pid, anuncia el socket y
# espera a que el pool lo detenga.
cat > "$F/credential-proxy" <<SH2
#!/usr/bin/env bash
source "$F/present-names.sh"
while [[ \$# -gt 0 ]]; do case "\$1" in --socket) sock="\$2"; shift 2 ;; *) shift ;; esac; done
printf 'names=%s|pid=%s\n' "\$(present_names)" "\$\$" > "\$PROXY_SAW"
echo "socket=\$sock"
exec sleep 300
SH2
# El proxy doble que rehúsa, como el real sin credencial propia: anota que lo
# invocaron y sale 2 sin anunciar socket.
cat > "$F/credential-proxy-refuses" <<SH2
#!/usr/bin/env bash
source "$F/present-names.sh"
printf 'names=%s|pid=%s\n' "\$(present_names)" "\$\$" > "\$PROXY_SAW"
echo "credentialProxy: sin credencial propia — NO se escucha." >&2
exit 2
SH2
# El runner doble: devuelve en `result` si vio el socket, si su ANTHROPIC_API_KEY
# es el marcador y qué nombres de credencial tiene.
cat > "$F/runner" <<SH2
#!/usr/bin/env bash
source "$F/present-names.sh"
cat > /dev/null
sock=unset; [[ -z "\${ANTHROPIC_UNIX_SOCKET:-}" ]] || sock=set
marker=no; [[ "\${ANTHROPIC_API_KEY:-}" != ssh-placeholder ]] || marker=yes
jq -cn --arg r "sock=\$sock|marker=\$marker|names=\$(present_names)" '{type:"result",result:\$r}'
SH2
chmod +x "$F/credential-proxy" "$F/credential-proxy-refuses" "$F/runner"
printf 'Lee.\n' > "$F/prompt.md"

# Cada caso parte de un entorno SIN ninguna variable de credencial y declara
# las suyas por `VARS`; el proxy y el historial se declaran por caso.
run() {
  local unset_args=() name
  for name in "${CREDENTIAL_NAMES[@]}"; do unset_args+=(-u "$name"); done
  rm -rf "$F/out" "$F/proxy-saw"
  SALIDA="$(printf 'alfa\n' | env "${unset_args[@]}" ${VARS:-} \
      PROXY_SAW="$F/proxy-saw" HEADLESS_POOL_RUNNER="$F/runner" HEADLESS_POOL_TIME="$F/no-existe" \
      HEADLESS_POOL_CREDENTIAL_PROXY="${PROXY:-$F/credential-proxy}" HEADLESS_POOL_HISTORY_DIR="$(mktemp -d -p "$F")" \
      bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --task-class analisis --width 1 "$@" 2>&1)"; CODE=$?
}
credential_line() { printf '%s\n' "$SALIDA" | gawk '/^credencial: /{print}'; }
summary_count() { printf '%s\n' "$SALIDA" | gawk '/^items=/{n++} END{print n+0}'; }
item_saw() { jq -r .result "$F/out/1.json" 2>/dev/null; }
proxy_saw() { cut -d'|' -f1 "$F/proxy-saw" 2>/dev/null || echo "no-invocado"; }
proxy_alive() { local pid; pid="$(cut -d'|' -f2 "$F/proxy-saw" 2>/dev/null | sed 's/^pid=//')"; [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null && echo vive || echo muerto; }
leaks() { { printf '%s\n' "$SALIDA"; cat "$F/out"/* "$F/out"/.* 2>/dev/null; } | grep -c "$SECRET"; }

# 1 — sin opción y sin credencial: inherit, y el pool dice que el ítem la resuelve solo.
VARS="" run
check "inherit sin credencial: exit 0" "$CODE" "0"
check "inherit sin credencial: la línea nombra la fuente y el porqué" "$(credential_line)" \
  "credencial: inherit (por defecto; sin variable de credencial en el entorno del pool: cada ítem la resuelve solo, y thyrox -p entra al proxy local)"
check "inherit sin credencial: el ítem no ve socket ni credencial" "$(item_saw)" "sock=unset|marker=no|names=none"
check "inherit sin credencial: no se lanza ningún proxy" "$(proxy_saw)" "no-invocado"
check "inherit: la decisión queda en la salida" "$(cat "$F/out/credential-source" 2>/dev/null)" "$(credential_line)"

# 2 — sin opción y con credencial: inherit, cada ítem la hereda; el valor no sale.
VARS="ANTHROPIC_API_KEY=$SECRET" run
check "inherit con credencial: la línea nombra la variable" "$(credential_line)" \
  "credencial: inherit (por defecto; ANTHROPIC_API_KEY en el entorno del pool: cada ítem la hereda)"
check "inherit con credencial: el ítem la hereda por nombre, sin socket" "$(item_saw)" "sock=unset|marker=no|names=ANTHROPIC_API_KEY"
check "inherit con credencial: el valor no aparece en la salida ni en los artefactos" "$(leaks)" "0"

# 3 — --credential-proxy con credencial: deriva proxy-env y nombra la variable
# que gana, en el orden de la cadena; sólo el proxy la ve.
VARS="ANTHROPIC_AUTH_TOKEN=$SECRET ANTHROPIC_API_KEY=$SECRET-2" run --credential-proxy
check "proxy-env derivada: exit 0" "$CODE" "0"
check "proxy-env derivada: la línea nombra la variable que gana" "$(credential_line)" \
  "credencial: proxy-env (derivada de --credential-proxy; ANTHROPIC_AUTH_TOKEN en el entorno del pool: sólo el proxy la ve)"
check "proxy-env derivada: el proxy ve las variables del entorno" "$(proxy_saw)" "names=ANTHROPIC_AUTH_TOKEN,ANTHROPIC_API_KEY"
check "proxy-env derivada: el ítem ve el socket y el marcador, sin credencial" "$(item_saw)" "sock=set|marker=yes|names=ANTHROPIC_API_KEY"
check "proxy-env derivada: el valor no aparece" "$(leaks)" "0"
check "proxy-env derivada: al terminar el pool el proxy ya no vive" "$(proxy_alive)" "muerto"

# 4 — --credential-proxy sin credencial: deriva proxy-store y lo dice; el proxy
# arranca sin ninguna variable de credencial.
VARS="" run --credential-proxy
check "proxy-store derivada: exit 0" "$CODE" "0"
check "proxy-store derivada: la línea lo dice" "$(credential_line)" \
  "credencial: proxy-store (derivada de --credential-proxy; sin variable de credencial en el entorno del pool: el proxy resuelve la conexión del store)"
check "proxy-store derivada: el proxy arranca sin variables de credencial" "$(proxy_saw)" "names=none"
check "proxy-store derivada: el ítem ve el socket y el marcador" "$(item_saw)" "sock=set|marker=yes|names=ANTHROPIC_API_KEY"

# 5 — proxy-store pedida y el proxy no tiene conexión: exit 2 con la causa,
# sin resumen, y la decisión queda escrita.
VARS="" PROXY="$F/credential-proxy-refuses" run --credential-source proxy-store
check "proxy-store sin store: exit 2" "$CODE" "2"
check "proxy-store sin store: sin resumen" "$(summary_count)" "0"
check "proxy-store sin store: rehúsa nombrando la fuente y la causa del proxy" \
  "$(printf '%s\n' "$SALIDA" | gawk '/REHUSA/ && /proxy-store/ && /sin credencial propia/{n++} END{print n+0}')" "1"
check "proxy-store sin store: la decisión se declaró antes de rehusar, y no queda archivo en la salida" \
  "$(credential_line) $(test -e "$F/out/credential-source" && echo archivo || echo sin-archivo)" \
  "credencial: proxy-store (declarada; sin variable de credencial en el entorno del pool: el proxy resuelve la conexión del store) sin-archivo"

# 6 — proxy-env pedida sin credencial en el entorno: rehúsa ANTES de lanzar el
# proxy, nombra las variables que esperaba, y no cae a proxy-store.
VARS="" run --credential-source proxy-env
check "proxy-env sin credencial: exit 2" "$CODE" "2"
check "proxy-env sin credencial: sin resumen" "$(summary_count)" "0"
check "proxy-env sin credencial: el proxy no se lanza" "$(proxy_saw)" "no-invocado"
check "proxy-env sin credencial: nombra las variables esperadas y que no cae a proxy-store" \
  "$(printf '%s\n' "$SALIDA" | gawk '/REHUSA/ && /ANTHROPIC_AUTH_TOKEN, THYROX_CODE_OAUTH_TOKEN, THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR o ANTHROPIC_API_KEY/ && /no se cae a proxy-store/{n++} END{print n+0}')" "1"

# 7 — proxy-store pedida CON credencial en el entorno: el proxy arranca sin
# ella —no la usa en silencio— y la línea lo declara.
VARS="ANTHROPIC_API_KEY=$SECRET" run --credential-source proxy-store
check "proxy-store con credencial en el entorno: exit 0" "$CODE" "0"
check "proxy-store con credencial en el entorno: la línea declara que se retira" "$(credential_line)" \
  "credencial: proxy-store (declarada; ANTHROPIC_API_KEY se retira del entorno del proxy: el proxy resuelve la conexión del store)"
check "proxy-store con credencial en el entorno: el proxy no la ve" "$(proxy_saw)" "names=none"
check "proxy-store con credencial en el entorno: el ítem ve el socket y el marcador" "$(item_saw)" "sock=set|marker=yes|names=ANTHROPIC_API_KEY"
check "proxy-store con credencial en el entorno: el valor no aparece" "$(leaks)" "0"

# 8 — proxy-env pedida con credencial: declarada, no derivada.
VARS="THYROX_CODE_OAUTH_TOKEN=$SECRET" run --credential-source proxy-env
check "proxy-env declarada: exit 0" "$CODE" "0"
check "proxy-env declarada: la línea la da por declarada" "$(credential_line)" \
  "credencial: proxy-env (declarada; THYROX_CODE_OAUTH_TOKEN en el entorno del pool: sólo el proxy la ve)"
check "proxy-env declarada: el proxy ve la variable" "$(proxy_saw)" "names=THYROX_CODE_OAUTH_TOKEN"

# 9 — inherit pedida con credencial: declarada, y --credential-proxy la contradice.
VARS="ANTHROPIC_API_KEY=$SECRET" run --credential-source inherit
check "inherit declarada: la línea" "$(credential_line)" \
  "credencial: inherit (declarada; ANTHROPIC_API_KEY en el entorno del pool: cada ítem la hereda)"
VARS="ANTHROPIC_API_KEY=$SECRET" run --credential-source inherit --credential-proxy
check "inherit con --credential-proxy: exit 2" "$CODE" "2"
check "inherit con --credential-proxy: lo nombra como contradicción, sin lanzar el proxy" \
  "$(printf '%s\n' "$SALIDA" | gawk '/REHUSA/ && /inherit/ && /--credential-proxy/{n++} END{print n+0}') $(proxy_saw)" "1 no-invocado"

# 10 — una fuente desconocida rehúsa nombrando las tres.
VARS="" run --credential-source otra
check "fuente desconocida: exit 2" "$CODE" "2"
check "fuente desconocida: nombra las tres" \
  "$(printf '%s\n' "$SALIDA" | gawk '/REHUSA/ && /inherit/ && /proxy-env/ && /proxy-store/{n++} END{print n+0}')" "1"

# 11 — `--store-credential-proxy` sólo sirve proxy-store-url: junto a otra
# fuente declarada rehúsa antes de lanzar, sin invocar ningún proxy.
VARS="" run --store-credential-proxy --credential-source proxy-store
check "store-url con otra fuente: exit 2" "$CODE" "2"
check "store-url con otra fuente: nombra la fuente que sí sirve" \
  "$(printf '%s\n' "$SALIDA" | gawk '/REHUSA/ && /--store-credential-proxy/ && /proxy-store-url/{n++} END{print n+0}')" "1"
check "store-url con otra fuente: no se lanza ningún proxy" "$(proxy_saw)" "no-invocado"

echo; echo "aserciones: $((total - failures)) de $total · fallos: $failures"
[[ $failures -eq 0 ]]

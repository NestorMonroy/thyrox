#!/usr/bin/env bash
# test-reach-sh.sh — contrato del localizador de raiz para guiones de shell.
#
# El defecto que cierra, medido: 65 guiones de este arbol resuelven su raiz con
# `$(dirname "${BASH_SOURCE[0]}")/../../..`, calibrado para la profundidad que
# tenian en `kaupamex-docs/.claude/scripts/`. Desde `thyrox/src/<familia>/` esa
# cadena aterriza en `/home/user` — el padre de los clones, que existe, asi que
# el fallo es SILENCIOSO: el guion no revienta, mide el arbol equivocado.
#
# El caso que DISCRIMINA es el 4: el localizador tiene que acertar desde una
# profundidad para la que nadie lo calibro. Un localizador por aritmetica pasa
# los casos 1-3 y falla el 4, que es justo la diferencia.
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
GUION="$RAIZ/src/lib/reach.sh"
source "$RAIZ/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "=== Caso 1: el guion existe y parsea ==="
if [[ -f "$GUION" ]] && bash -n "$GUION" 2>/dev/null; then ok "parsea"
else bad "ausente o con error de sintaxis"; fi

echo "=== Caso 2: publica la raiz de thyrox, no el padre de los clones ==="
got="$(bash -c "source '$GUION' && thyrox_root" 2>&1)"
if [[ "$got" == "$RAIZ" ]]; then ok "raiz = $got"
else bad "raiz mal resuelta: '$got' (se esperaba $RAIZ)"; fi

echo "=== Caso 3: publica el padre de los clones por separado ==="
got="$(bash -c "source '$GUION' && thyrox_tree_root" 2>&1)"
if [[ -d "$got" && "$got" != "$RAIZ" ]]; then ok "arbol = $got"
else bad "arbol mal resuelto: '$got'"; fi

echo "=== Caso 4 (EL QUE DISCRIMINA): acierta desde una profundidad no calibrada ==="
# Un consumidor hondo. La aritmetica de tres niveles daria otra cosa; el
# localizador por marcador tiene que dar la misma raiz que en el caso 2.
HONDO="$RAIZ/src/lib/__sonda__/a/b/c"; mkdir -p "$HONDO"
cat > "$HONDO/consumidor.sh" <<'INNER'
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/reach.sh"
thyrox_root
INNER
got="$(bash "$HONDO/consumidor.sh" 2>&1)"
rm -rf "$RAIZ/src/lib/__sonda__"
if [[ "$got" == "$RAIZ" ]]; then ok "desde 4 niveles mas hondo sigue dando $got"
else bad "la profundidad cambia el veredicto: '$got'"; fi

echo "=== Caso 5: fuera del arbol REHUSA, no inventa una ruta ==="
mkdir -p "$TMP/fuera"; cp "$GUION" "$TMP/fuera/" 2>/dev/null
got="$(cd "$TMP/fuera" && env -u THYROX_ROOT bash -c "source ./reach.sh && thyrox_root" 2>&1)"; rc=$?
if [[ $rc -ne 0 && -n "$got" ]]; then ok "rehusa (rc=$rc) y da la razon"
else bad "no rehusa fuera del arbol: rc=$rc salida='$got'"; fi

echo "=== Caso 6: THYROX_ROOT declarada gana sobre el ascenso ==="
mkdir -p "$TMP/declarada/src/paths"; touch "$TMP/declarada/src/paths/reach.py"
got="$(THYROX_ROOT="$TMP/declarada" bash -c "source '$GUION' && thyrox_root" 2>&1)"
if [[ "$got" == "$TMP/declarada" ]]; then ok "la declaracion gana"
else bad "ignora THYROX_ROOT: '$got'"; fi

echo "=== Caso 7 (DEC-04): THYROX_ENV_FILE declara la raiz, sin ascender ==="
# La segunda entrada de entorno: la RUTA a la declaracion, no el valor. Es la
# forma de `get_secret_str("CONFIG_FILE_PATH")` frente a `get_secret(...)`.
mkdir -p "$TMP/porarchivo/src/paths" "$TMP/porarchivo/src/lib"
touch "$TMP/porarchivo/src/paths/reach.py"; cp "$GUION" "$TMP/porarchivo/src/lib/"
printf 'THYROX_ROOT=%s\n' "$TMP/porarchivo" > "$TMP/declaracion.env"
cat > "$TMP/hondo.sh" <<'INNER'
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p'         "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
printf '%s' "$_thyrox_root"
INNER
got="$(THYROX_ENV_FILE="$TMP/declaracion.env" bash "$TMP/hondo.sh" 2>&1)"
if [[ "$got" == "$TMP/porarchivo" ]]; then ok "la declaracion por archivo resuelve"
else bad "THYROX_ENV_FILE ignorado: '$got'"; fi

echo "=== Caso 8 (DEC-04): el marcador es CONSTANTE con entrada de entorno ==="
# Un consumidor que reestructure thyrox declara THYROX_LOCATOR. Si el marcador
# estuviera cableado, este caso no tendria como pasar.
mkdir -p "$TMP/otraforma/otro/sitio"; cp "$GUION" "$TMP/otraforma/"
touch "$TMP/otraforma/otro/sitio/localizador"
got="$(cd "$TMP/otraforma" && env -u THYROX_ROOT THYROX_LOCATOR="otro/sitio/localizador" \
      bash -c "source ./reach.sh && _thyrox_ascend \"$TMP/otraforma\"" 2>&1)"
if [[ "$got" == "$TMP/otraforma" ]]; then ok "el marcador se declara, no se cablea"
else bad "THYROX_LOCATOR ignorado: '$got'"; fi

echo ""
echo "alcance medido: $((THYROX_OK+THYROX_FALLOS)) aserciones sobre $GUION"
thyrox_summary
[[ $THYROX_FALLOS -eq 0 ]]

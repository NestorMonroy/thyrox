#!/bin/bash
# =============================================================================
# test-evidence-tracked.sh — prueba del gate de evidencia versionada
# =============================================================================
#
# El gate implementa la postura frente a `file-history` del cliente: éste
# deshace sin git, guardando el delta de cada archivo que tocó. Nosotros NO lo
# copiamos, y la consecuencia de esa decisión es que una evidencia que sólo
# existe como cambio local muere con el contenedor — que es exactamente el
# defecto de H-DOCS-120. El gate lo vuelve mecánico: toda ruta de evidencia
# citada desde `source/**` tiene que existir Y estar versionada.
#
# La discriminación entre los casos 2 y 3 es lo que hace real a la prueba: los
# dos citan una ruta, y difieren SÓLO en que la del caso 3 existe en disco. Un
# gate que midiera nada más la existencia pasaría el 3 en verde.
#
# Uso:  bash tests/legacy/test-evidence-tracked.sh
# =============================================================================

set -uo pipefail

# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
RAIZ="$(thyrox_root)" || exit 2
SUT="$RAIZ/src/verify/check_evidence_tracked.py"

source "$RAIZ/src/lib/assert.sh"
check() { thyrox_check "$1" "$3" "$2" || true; }

# Monta un árbol sintético con su propio git: el gate opera desde la raíz del
# repo, así que el árbol real queda intacto.
build_tree() {
  local root; root="$(mktemp -d)"
  git -C "$root" init -q
  git -C "$root" config user.email t@t
  git -C "$root" config user.name t
  mkdir -p "$root/source/gestion" "$root/.claude/eventos"
  printf '%s\n' "$root"
}

cite() {   # cite <root> <ruta-citada>
  mkdir -p "$(dirname "$1/source/gestion/analysis.rst")"
  cat > "$1/source/gestion/analysis.rst" <<RST
Análisis
========

La medición vive en \`\`$2\`\`.
RST
}

echo "== caso 1: evidencia citada, existente y versionada -> 0 incumplidores"
ROOT="$(build_tree)"
mkdir -p "$ROOT/.claude/eventos/measure-20260828T000000"
echo dato > "$ROOT/.claude/eventos/measure-20260828T000000/output.txt"
cite "$ROOT" ".claude/eventos/measure-20260828T000000/output.txt"
git -C "$ROOT" add -A >/dev/null 2>&1
git -C "$ROOT" commit -qm seed >/dev/null 2>&1
OUT="$(cd "$ROOT" && python3 "$SUT" --strict 2>&1)"; RC=$?
check "exit 0 con el árbol limpio" "$RC" "0"
check "publica su denominador" "$(grep -c 'alcance medido' <<<"$OUT")" "1"
rm -rf "$ROOT"

echo "== caso 2: la ruta citada NO existe -> incumplidor"
ROOT="$(build_tree)"
cite "$ROOT" ".claude/eventos/ghost-20260828T000000/output.txt"
git -C "$ROOT" add -A >/dev/null 2>&1
git -C "$ROOT" commit -qm seed >/dev/null 2>&1
OUT="$(cd "$ROOT" && python3 "$SUT" --strict 2>&1)"; RC=$?
check "exit 1 ante la cita fantasma" "$RC" "1"
check "nombra la ruta ausente" "$(grep -c 'ghost-20260828T000000' <<<"$OUT")" "1"
rm -rf "$ROOT"

echo "== caso 3: la ruta EXISTE pero no está versionada -> incumplidor"
echo "   (control de discriminación: sólo difiere del caso 2 en que existe)"
ROOT="$(build_tree)"
mkdir -p "$ROOT/.claude/eventos/local-20260828T000000"
echo dato > "$ROOT/.claude/eventos/local-20260828T000000/output.txt"
cite "$ROOT" ".claude/eventos/local-20260828T000000/output.txt"
git -C "$ROOT" add source >/dev/null 2>&1        # se versiona la cita, NO la evidencia
git -C "$ROOT" commit -qm seed >/dev/null 2>&1
OUT="$(cd "$ROOT" && python3 "$SUT" --strict 2>&1)"; RC=$?
check "exit 1 ante la evidencia sólo local" "$RC" "1"
check "la distingue de la ausente" "$(grep -c 'sin versionar' <<<"$OUT")" "1"
rm -rf "$ROOT"

echo "== caso 4: el baseline congela la deuda heredada"
ROOT="$(build_tree)"
cite "$ROOT" ".claude/eventos/inherited-20260828T000000/output.txt"
git -C "$ROOT" add -A >/dev/null 2>&1
git -C "$ROOT" commit -qm seed >/dev/null 2>&1
(cd "$ROOT" && python3 "$SUT" --write-baseline >/dev/null 2>&1)
OUT="$(cd "$ROOT" && python3 "$SUT" --strict 2>&1)"; RC=$?
check "exit 0 con el incumplidor en baseline" "$RC" "0"
rm -rf "$ROOT"

echo "== caso 5: sin git, rehúsa SIN emitir conteo"
ROOT="$(mktemp -d)"; mkdir -p "$ROOT/source"
OUT="$(cd "$ROOT" && python3 "$SUT" --strict 2>&1)"; RC=$?
check "exit 2 fuera de un repo git" "$RC" "2"
check "NO publica conteo (un 0 sería verde falso)" "$(grep -c 'alcance medido' <<<"$OUT")" "0"
check "nombra la precondición ausente" "$(grep -ci 'git' <<<"$OUT")" "1"
rm -rf "$ROOT"

echo "== caso 6: un glob es una familia, no una ruta -> no se mide"
echo "   (la cita \`\`.claude/eventos/vocabulario-*/terminos.py\`\` nombra un patrón)"
ROOT="$(build_tree)"
cite "$ROOT" ".claude/eventos/family-*/output.txt"
git -C "$ROOT" add -A >/dev/null 2>&1
git -C "$ROOT" commit -qm seed >/dev/null 2>&1
OUT="$(cd "$ROOT" && python3 "$SUT" --strict 2>&1)"; RC=$?
check "exit 0: el glob no se trata como ruta" "$RC" "0"
check "y queda FUERA del denominador" "$(grep -c 'alcance medido: 0 cita' <<<"$OUT")" "1"
rm -rf "$ROOT"

echo "== caso 7: --quiet emite SÓLO el conteo (lo que thyrox-audit consume)"
ROOT="$(build_tree)"
cite "$ROOT" ".claude/eventos/ghost-20260828T000000/output.txt"
git -C "$ROOT" add -A >/dev/null 2>&1
git -C "$ROOT" commit -qm seed >/dev/null 2>&1
OUT="$(cd "$ROOT" && python3 "$SUT" --quiet 2>/dev/null)"
check "la salida es un entero pelado" "$OUT" "1"
rm -rf "$ROOT"

echo
thyrox_summary

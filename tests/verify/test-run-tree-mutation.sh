#!/usr/bin/env bash
# `tests/run.sh` declara «no atribuible» si el árbol cambió mientras medía.
#
# Una suite larga mide un árbol que puede cambiar mientras corre (una edición
# del orquestador, un commit de otro escritor, el mutante que otra suite deja
# a medias). Si el árbol del final no es el del principio, el veredicto no
# corresponde a ningún estado: el corredor sale 3 y lo dice, en vez de
# publicar rojo o verde. Se mide con dos gemelos: el mismo repo sintético con
# y sin una suite que escribe en `src/`.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
total=0; fallos=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }

fixture() {
  local repo="$1"
  mkdir -p "$repo/tests" "$repo/src/verify"
  cp "$RAIZ/tests/run.sh" "$repo/tests/run.sh"
  cp "$RAIZ/src/verify/__init__.py" "$RAIZ/src/verify/tree_fingerprint.py" "$repo/src/verify/"
  printf 'exit 0\n' > "$repo/tests/test_ok.sh"
  git -C "$repo" init -q
  git -C "$repo" -c user.name=t -c user.email=t@t -c commit.gpgsign=false add .
  git -C "$repo" -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -q -m seed
}

echo "== 1. gemelo quieto: el árbol no cambia y el veredicto sale =="
fixture "$T/quieto"
salida="$(bash "$T/quieto/tests/run.sh" --shell-only 2>&1)"; code=$?
check "exit 0" "$code" "0"
check "sin aviso de árbol mutado" "$(printf '%s' "$salida" | gawk '/MUTADO/{n++} END{print n+0}')" "0"

echo "== 2. una suite escribe en src/: el veredicto no es atribuible =="
fixture "$T/muta"
printf 'echo x > "$(dirname "$0")/../src/nuevo.py"\n' > "$T/muta/tests/test_muta.sh"
git -C "$T/muta" -c user.name=t -c user.email=t@t -c commit.gpgsign=false add tests/test_muta.sh
git -C "$T/muta" -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -q -m muta
salida="$(bash "$T/muta/tests/run.sh" --shell-only 2>&1)"; code=$?
check "exit 3, ni verde ni rojo" "$code" "3"
check "lo declara" "$(printf '%s' "$salida" | gawk '/ÁRBOL MUTADO durante la medición/{n++} END{print n+0}')" "1"
check "y dice qué veredicto habría dado" "$(printf '%s' "$salida" | gawk '/habría sido: verde/{n++} END{print n+0}')" "1"

echo "== 3. también en --changed =="
fixture "$T/changed"
printf 'echo y >> "$(dirname "$0")/../src/verify/tree_fingerprint.py"\n' > "$T/changed/tests/test_toca.sh"
salida="$(cd "$T/changed" && bash tests/run.sh --changed 2>&1)"; code=$?
check "--changed con árbol mutado: exit 3" "$code" "3"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))

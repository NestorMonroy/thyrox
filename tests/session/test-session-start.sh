#!/usr/bin/env bash
# Contrato de src/session/session-start.sh: no lee `.thyrox/context`.
#
# Ese directorio era el estado del THYROX anterior y no existe en este árbol
# ni en sus consumidores: el estado vive en el `docs` del consumidor. Leerlo
# daba un «Sin work package activo» fijo, que se leía como estado medido.
#
# El control discrimina: el proveedor de prueba SÍ trae un
# `.thyrox/context/now.md` con un WP activo. Con la lectura en su sitio el
# guion lo anuncia; retirada, no. El fixture no trae
# `reconcile_user_hooks.py`, así que el guion no toca el `~/.claude` real.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUT="$RAIZ/src/session/session-start.sh"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

PROVEEDOR="$TMP/proveedor"
mkdir -p "$PROVEEDOR/src/paths" "$PROVEEDOR/src/lib" "$PROVEEDOR/src/session" \
         "$PROVEEDOR/.thyrox/context/work/wp-fantasma"
cp "$RAIZ/src/paths/reach.py" "$PROVEEDOR/src/paths/"
cp "$RAIZ/src/lib/reach.sh" "$PROVEEDOR/src/lib/"
cp "$SUT" "$PROVEEDOR/src/session/"
printf 'stage: Stage 3\ncurrent_work: context/work/wp-fantasma\n' \
    > "$PROVEEDOR/.thyrox/context/now.md"

OK=0; FALLO=0
afirmar() {
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok    %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

SALIDA="$(THYROX_ROOT="$PROVEEDOR" bash "$PROVEEDOR/src/session/session-start.sh" </dev/null 2>&1)"
COD=$?
afirmar "sale 0" "0" "$COD"
afirmar "no anuncia el WP de .thyrox/context" "no" \
    "$(grep -qF 'wp-fantasma' <<<"$SALIDA" && echo si || echo no)"
afirmar "no publica un stage leído de now.md" "no" \
    "$(grep -qF 'Stage 3' <<<"$SALIDA" && echo si || echo no)"
afirmar "ninguna línea ejecutable nombra .thyrox/context" "0" \
    "$(grep -v '^[[:space:]]*#' "$SUT" | grep -c '\.thyrox/context')"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]

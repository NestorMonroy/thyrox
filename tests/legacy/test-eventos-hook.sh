#!/usr/bin/env bash
# Pruebas de check_eventos_hook.py — el nombre del evento con que un hook se
# declara contra los que el ejecutable despacha.
#
# Por qué existe: un nombre mal escrito en `settings.json` no produce error.
# El hook simplemente NO dispara, y el gate que aloja deja de correr sin que
# nada lo diga. Es el hermano de #711 (rutas de hook rotas), que sí ocurrió:
# ahí el script no existía; aquí el evento no existe.
#
# La forma se adapta de `hookTypeGuards.test.ts` del corpus `ccb`, que guarda
# la misma frontera con `isHookEvent` y lo dice con todas sus letras:
# «aceptar un string desconocido como HookEvent deja que la configuración
# derive en silencio».
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$RAIZ/.claude/scripts/gates/check_eventos_hook.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OK=0
FALLO=0
afirmar() { # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

BIN="$(readlink -f "$(command -v claude)")"

# ---------------------------------------------------------------- caso 1
# Control positivo real: los cinco repos de esta sesión, sin desconocidos.
python3 "$GATE" --strict >/dev/null 2>&1
afirmar "el arbol vivo no declara ningun evento desconocido" "0" "$?"

# ---------------------------------------------------------------- caso 2
# Control negativo DISCRIMINANTE: un typo del corpus `ccb` — `PreToolUsage`
# es uno de los que su suite enumera. Sin este caso el verde del 1 no
# distinguiria «no hay typos» de «el gate no mira el nombre».
mkdir -p "$TMP/typo/.claude"
printf '{"hooks":{"PreToolUsage":[]}}' > "$TMP/typo/.claude/settings.json"
python3 "$GATE" --strict --repo "$TMP/typo" >/dev/null 2>&1
afirmar "un evento con typo sale con codigo 1" "1" "$?"

# ---------------------------------------------------------------- caso 3
# La diferencia de caja tambien: el despacho es sensible a mayusculas.
mkdir -p "$TMP/caja/.claude"
printf '{"hooks":{"preToolUse":[]}}' > "$TMP/caja/.claude/settings.json"
python3 "$GATE" --strict --repo "$TMP/caja" >/dev/null 2>&1
afirmar "la caja distinta sale con codigo 1" "1" "$?"

# ---------------------------------------------------------------- caso 4
# Un evento valido en un repo fabricado NO bloquea: el gate mide el nombre,
# no la existencia del script (eso lo cubre el gate de rutas).
mkdir -p "$TMP/bueno/.claude"
printf '{"hooks":{"SessionStart":[]}}' > "$TMP/bueno/.claude/settings.json"
python3 "$GATE" --strict --repo "$TMP/bueno" >/dev/null 2>&1
afirmar "un evento valido no bloquea" "0" "$?"

# ---------------------------------------------------------------- caso 5
# Sin universo NO hay veredicto: un binario del que no se extrae ningun
# evento sale con 2, no con 0. Un cero ahi seria un verde falso.
printf 'un binario que no declara ningun evento de hook' > "$TMP/pelado.bin"
python3 "$GATE" --binario "$TMP/pelado.bin" --repo "$TMP/bueno" >/dev/null 2>&1
afirmar "sin universo derivable sale con codigo 2" "2" "$?"

# ---------------------------------------------------------------- caso 6
# El reporte publica su denominador: cuantos eventos declara el ejecutable y
# cuantos declaramos nosotros. Un conteo sin universo no es un resultado.
afirmar "el reporte declara ambos universos" "1" \
    "$(python3 "$GATE" | grep -c 'universo')"

# ---------------------------------------------------------------- caso 7
# Y la mitad inversa: los eventos que el ejecutable despacha y nosotros no
# usamos. Es capacidad no consumida, y sin nombrarla no se puede triar.
afirmar "el reporte nombra los eventos sin consumir" "1" \
    "$(python3 "$GATE" | grep -c 'sin consumir')"

# ---------------------------------------------------------------- caso 8
# CONTROL POSITIVO REAL, no fabricado: /home/user/.claude/settings.local.json
# declara 10 eventos —tres de ellos (ConfigChange, CwdChanged, FileChanged) que
# la primera versión del gate publicó como «sin consumir»—. El gate leía sólo
# las cinco raíces de repo, así que su verde no distinguía «no hay typos» de
# «no miré donde estaban los hooks». Ver H-DOCS-479.
afirmar "la raiz del arbol de trabajo entra en el alcance" "1" \
    "$(python3 "$GATE" | grep -c 'settings.local.json')"
afirmar "ConfigChange NO se reporta como sin consumir" "0" \
    "$(python3 "$GATE" | grep -c 'sin consumir.*ConfigChange')"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]

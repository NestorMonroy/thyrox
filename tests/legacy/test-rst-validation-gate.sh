#!/usr/bin/env bash
# Pruebas de inject_rst_validation_gate.py — el detector que ataja la
# validación de RST escrita a mano.
#
# El control positivo NO está fabricado: es el comando literal que se ejecutó
# en esta misma sesión al validar el hallazgo H-API-927, y que produjo
# `ModuleNotFoundError: No module named 'docutils'` seguido de un
# `--- validado ---` impreso igual. Las dos mitades del defecto en una línea.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DETECTOR="$RAIZ/.claude/hooks/inject_rst_validation_gate.py"
DESPACHADOR="$RAIZ/.claude/hooks/despachar_pretooluse.py"

OK=0
FALLO=0
afirmar() { # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

# Devuelve "AVISA" o "silencioso" para un comando dado.
veredicto() {
    python3 - "$DETECTOR" "$1" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location('detector', sys.argv[1])
modulo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(modulo)
aviso = modulo.detectar({'tool_input': {'command': sys.argv[2]}})
print('AVISA' if aviso else 'silencioso')
PY
}

# ------------------------------------------------------------------ caso 1
# Control positivo real: el comando de esta sesión, verbatim.
REAL='python3 -c "
import docutils.core, sys
src = open(f).read()
docutils.core.publish_doctree(src, settings_overrides={})
" 2>&1 | grep -v "Unknown interpreted text role" | head -10; echo "--- validado ---"'
afirmar "el comando real de la sesión dispara" "AVISA" "$(veredicto "$REAL")"

# ------------------------------------------------------------------ caso 2
# El gate correcto NO dispara — si lo hiciera, el aviso sería ruido en el
# único camino que queremos que se tome.
afirmar "el gate real no dispara" "silencioso" \
    "$(veredicto 'python3 .claude/scripts/gates/check_rst_sintaxis.py a.rst')"

# ------------------------------------------------------------------ caso 3
# La segunda mitad, sola: sin docutils, sólo el verde falso.
afirmar "el verde falso solo" "AVISA" \
    "$(veredicto 'uv run pytest -q ; echo "--- validado ---"')"

# ------------------------------------------------------------------ caso 4
# `&&` sí corta ante el fallo: no es el defecto y no debe avisar.
afirmar "con && no avisa" "silencioso" \
    "$(veredicto 'uv run pytest -q && echo "validado"')"

# ------------------------------------------------------------------ caso 5
# Un comando cualquiera queda mudo — el detector no cobra peaje al resto.
afirmar "comando inocente" "silencioso" "$(veredicto 'git status --short')"

# ------------------------------------------------------------------ caso 6
# Extremo a extremo por el despachador, que es como corre de verdad.
SALIDA=$(printf '{"tool_input":{"command":"python3 -c \\"import docutils\\""}}' \
    | python3 "$DESPACHADOR")
afirmar "el despachador etiqueta el bloque" "si" \
    "$(grep -q 'rst_validation_gate' <<<"$SALIDA" && echo si || echo no)"

# ------------------------------------------------------------------ caso 7
# Nunca rompe el flujo: stdin vacío sale 0 con objeto vacío.
VACIO=$(printf '' | python3 "$DESPACHADOR"); CODIGO=$?
afirmar "stdin vacío sale 0" "0" "$CODIGO"
afirmar "stdin vacío emite {}" "{}" "$VACIO"

printf '\n%d aserciones, %d ok, %d fallas\n' "$((OK + FALLO))" "$OK" "$FALLO"
[[ $FALLO -eq 0 ]]

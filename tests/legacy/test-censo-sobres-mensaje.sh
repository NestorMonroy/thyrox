#!/usr/bin/env bash
# Pruebas de censo_sobres_mensaje.py — el censo de sobres de mensaje entre
# agentes que el ejecutable declara.
#
# Por qué existe: `bash-background-tasks.md` cita la forma del sobre
# (`<agent-message from="…">`) como evidencia medida, y esa forma es una
# propiedad de la build. Sin censo, la cita envejece en silencio cuando el
# contenedor actualiza el ejecutable — que ya pasó una vez (H-DOCS-455).
#
# El control positivo NO está fabricado: es el ejecutable de esta sesión.
# Los negativos sí, porque no existe una build sin sobres que citar.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CENSO="$RAIZ/.claude/scripts/censo_sobres_mensaje.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OK=0
FALLO=0
afirmar() { # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

# ---------------------------------------------------------------- caso 1
# Control positivo real: el ejecutable de esta sesión declara los TRES sobres.
BIN="$(readlink -f "$(command -v claude)")"
afirmar "el ejecutable vivo declara 3 sobres" "3" \
    "$(python3 "$CENSO" --quiet "$BIN")"

# ---------------------------------------------------------------- caso 2
# Control negativo con UNO. Sin este caso, un censo que imprimiera «3» fijo
# pasaría el caso 1 y no mediría nada — el verde no discriminaría.
printf 'ruido <agent-message from="x"> mas ruido' > "$TMP/uno.bin"
afirmar "un binario con un solo sobre reporta 1" "1" \
    "$(python3 "$CENSO" --quiet "$TMP/uno.bin")"

# ---------------------------------------------------------------- caso 3
# Control negativo con CERO, y su código de salida. «No pude medir» no es
# «no hay»: sin sobres el censo rehúsa en vez de publicar un 0 tranquilo.
printf 'un binario sin ningun sobre de mensaje' > "$TMP/cero.bin"
python3 "$CENSO" --quiet "$TMP/cero.bin" >/dev/null 2>&1
afirmar "cero sobres sale con codigo 2, no 0" "2" "$?"

# ---------------------------------------------------------------- caso 4
# El censo publica su denominador: qué sobres buscó, no sólo cuántos halló.
afirmar "el reporte declara el universo buscado" "1" \
    "$(python3 "$CENSO" "$BIN" | grep -c 'universo')"

# ---------------------------------------------------------------- caso 5
# El VEREDICTO, no la etiqueta. La versión previa contaba el literal
# `teammate_id` en la línea del reporte — literal que se imprime igual diga
# `interpolado` o `ausente`. Pasaba en los dos casos: un control que no puede
# fallar (sub-patrón D de `metrica-decide-la-conclusion`).
afirmar "teammate_id sale interpolado en el ejecutable vivo" "1" \
    "$(python3 "$CENSO" "$BIN" | grep -c 'teammate_id: interpolado')"

# ---------------------------------------------------------------- caso 6
# Y su negativo: sin la plantilla interpolada, el mismo sobre da `ausente`.
# Es lo que hace del caso 5 una medición y no una etiqueta.
printf 'ruido <teammate-message> sin plantilla ni atributo' > "$TMP/pelado.bin"
afirmar "sin plantilla interpolada el atributo sale ausente" "1" \
    "$(python3 "$CENSO" "$TMP/pelado.bin" | grep -c 'teammate_id: ausente')"

# ---------------------------------------------------------------- caso 7
# `indecidible` no es `ausente`: con el atributo compartido por dos sobres del
# universo, el instrumento declara que no puede atribuir la plantilla.
afirmar "el atributo compartido sale indecidible, no ausente" "1" \
    "$(python3 "$CENSO" "$BIN" | grep -c 'agent-message — atributo from: indecidible')"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]

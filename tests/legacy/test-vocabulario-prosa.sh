#!/usr/bin/env bash
# Pruebas de check-vocabulario-inventado.py — el gate de la cuarta prueba de
# vocabulario (``redaccion-tecnica-es.md``).
#
# El control positivo NO está fabricado: es «democión», la palabra inventada
# que se escribió de verdad en el hallazgo H-DOCS-230 y que el ejecutor
# corrigió. Se recupera de ``docs@e12c9300`` y se cita verbatim abajo. Es lo
# que ``hallazgo-abierto-genera-sucesor.md`` exige tras haber publicado tres
# ceros falsos: un incumplidor real del repo, no uno escrito por quien escribió
# el patrón.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$RAIZ/.claude/scripts/gates/check_vocabulario_prosa.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OK=0
FALLO=0
afirmar() { # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

# ---------------------------------------------------------------- caso 1
# El guard de librería: sin el léxico NO se emite conteo. Se fuerza con un
# PYTHONPATH que antepone un paquete falso cuyo import revienta.
mkdir -p "$TMP/sin-lexico/spacy_lookups_data"
printf 'raise ModuleNotFoundError("spacy_lookups_data")\n' \
    > "$TMP/sin-lexico/spacy_lookups_data/__init__.py"
SALIDA=$(PYTHONPATH="$TMP/sin-lexico" python3 "$GATE" --quiet 2>&1)
CODIGO=$?
afirmar "guard de librería: exit 2, no 0" "2" "$CODIGO"
afirmar "guard de librería: no emite cifra" "0" "$(printf '%s' "$SALIDA" | grep -cE '^[0-9]+$')"
afirmar "guard de librería: nombra la librería" "1" \
    "$(printf '%s' "$SALIDA" | grep -c 'spacy-lookups-data')"

# ---------------------------------------------------------------- caso 2
# Control positivo REAL — la línea 47 de docs@e12c9300, verbatim.
#
# Va con --no-baseline a propósito: «democión» ESTÁ en el baseline, porque la
# regla que la prohíbe la cita como ejemplo. Con el baseline puesto este
# control no podría fallar nunca, y un control que no puede fallar no
# discrimina (sub-patrón D). Aquí se mide el DETECTOR; la política se mide en
# el caso 3.
cat > "$TMP/control-positivo.rst" <<'RST'
Descripción — la compactación es una democión silenciosa a nivel 4
RST
afirmar "el detector ve el control positivo real (democión)" "1" \
    "$(python3 "$GATE" --quiet --no-baseline "$TMP/control-positivo.rst" 2>/dev/null)"

# ---------------------------------------------------------------- caso 3
# La otra mitad: el baseline SÍ silencia lo congelado. Sin este caso no
# constaría que el baseline hace algo, sólo que el detector dispara.
afirmar "el baseline silencia lo congelado" "0" \
    "$(python3 "$GATE" --quiet "$TMP/control-positivo.rst" 2>/dev/null)"

# ---------------------------------------------------------------- caso 4
# Control negativo — la corrección que se aplicó en docs@ce05be7f. La palabra
# real está atestiguada y el gate NO la marca ni ignorando el baseline. Sin
# este caso el verde no discriminaría «no hay inventos» de «el instrumento no
# ve nada».
cat > "$TMP/control-negativo.rst" <<'RST'
Descripción — la compactación es una degradación silenciosa a nivel 4
RST
afirmar "no marca la palabra real (degradación)" "0" \
    "$(python3 "$GATE" --quiet --no-baseline "$TMP/control-negativo.rst" 2>/dev/null)"

# ---------------------------------------------------------------- caso 5
# --strict devuelve 1 ante un nuevo, 0 cuando no hay.
python3 "$GATE" --quiet --strict --no-baseline "$TMP/control-positivo.rst" >/dev/null 2>&1
afirmar "--strict sale 1 con un inventado" "1" "$?"
python3 "$GATE" --quiet --strict --no-baseline "$TMP/control-negativo.rst" >/dev/null 2>&1
afirmar "--strict sale 0 sin inventados" "0" "$?"

# ---------------------------------------------------------------- caso 5
# El baseline silencia lo congelado, y sólo lo congelado.
afirmar "el árbol con su baseline no reporta nuevos" "0" \
    "$(python3 "$GATE" --quiet 2>/dev/null)"

# ---------------------------------------------------------------- caso 6
# El reporte publica su denominador: un conteo sin alcance no es un resultado.
afirmar "el reporte declara el alcance medido" "1" \
    "$(python3 "$GATE" "$TMP/control-negativo.rst" 2>/dev/null | grep -c 'alcance medido')"

# El denominador nombra ARCHIVOS, y ese es su significado. Decía
# `{len(found)} de {len(files)} archivos` con `found` = hallazgos: dos
# magnitudes bajo un rótulo. Una sonda de 1 archivo imprimía «0 de 1
# archivos» y se leyó como «no midió nada». El caso mide el rótulo, no la
# presencia de la frase.
afirmar "y el denominador cuenta archivos, no hallazgos" "1" \
    "$(python3 "$GATE" "$TMP/control-negativo.rst" 2>/dev/null \
       | grep -c 'alcance medido: 1 archivo(s)')"

# ---------------------------------------------------------------- caso 7
# EL TERCER EJE: los términos resueltos de la tabla de sustitución. El gate
# tenía dos detectores —inventado y prohibido— y la regla enumera TRES
# fenómenos; `corrida` no la ve ninguno de los dos: está atestiguada, así que
# el léxico la acepta, y no estaba en la lista cerrada. Medido: se escribió
# «primera corrida» en un hallazgo NUEVO con la regla cargada y el gate salió
# verde. Ver :ref:`h-docs-244`.
cat > "$TMP/terminos-resueltos.rst" <<'RST'
La primera corrida del generador falló; la tanda de agentes también.
RST
afirmar "ve corrida y tanda en prosa nueva" "2" \
    "$(python3 "$GATE" --quiet --no-baseline "$TMP/terminos-resueltos.rst" 2>/dev/null)"

# La otra mitad, que es la que evita el falso positivo: NO se vetan `guion`
# ni `lote`. El censo (`terminos.py`) les mide sentidos legítimos que dominan
# —el signo, `stock.lot`, «edición en lote»— y vetarlos marcaría como defecto
# el uso correcto. Sin este caso, alguien añadiría los cuatro «por simetría».
cat > "$TMP/sentido-legitimo.rst" <<'RST'
El guion bajo separa las palabras; el lote de stock caduca en marzo.
RST
afirmar "NO veta guion ni lote — su sentido legítimo domina" "0" \
    "$(python3 "$GATE" --quiet --no-baseline "$TMP/sentido-legitimo.rst" 2>/dev/null)"

# ---------------------------------------------------------------- caso 8
# La clave del baseline no depende de la FORMA con que se nombre el archivo.
# Control positivo real, medido el 2026-08-26 durante #905: el mismo archivo,
# el mismo contenido y el mismo baseline daban **11 contra 0** segun se
# invocara con ruta relativa o con el barrido completo. Los once son las citas
# de anti-patron que la propia regla enumera, ya congeladas bajo la clave que
# produce el barrido — que es absoluta.
#
# Un gate cuyo veredicto cambia con la forma del argumento no sirve en un hook
# de escritura (solo conoce la ruta que el cliente le pasa) ni en un
# pre-commit (pasa rutas relativas al repo). Ver H-DOCS-460.
CONTROL=".claude/rules/redaccion-tecnica-es.md"
CUENTA_ABS=$(cd "$RAIZ" && python3 "$GATE" --quiet "$RAIZ/$CONTROL" 2>/dev/null)
CUENTA_REL=$(cd "$RAIZ" && python3 "$GATE" --quiet "$CONTROL" 2>/dev/null)
CUENTA_PUNTO=$(cd "$RAIZ" && python3 "$GATE" --quiet "./$CONTROL" 2>/dev/null)
CUENTA_RODEO=$(cd "$RAIZ/source" && python3 "$GATE" --quiet "../$CONTROL" 2>/dev/null)

afirmar "ruta absoluta: lo congelado sigue congelado" "0" "$CUENTA_ABS"
afirmar "ruta relativa a la raiz: mismo veredicto" "0" "$CUENTA_REL"
afirmar "ruta con ./ delante: mismo veredicto" "0" "$CUENTA_PUNTO"
afirmar "ruta con .. desde otro directorio: mismo veredicto" "0" "$CUENTA_RODEO"

# Y la otra mitad: la normalizacion NO puede volver ciego al detector. Un
# archivo NUEVO fuera del baseline sigue reportando, se le nombre como se le
# nombre. Sin este caso, «normalizar» podria implementarse devolviendo siempre
# la misma clave y las cuatro afirmaciones de arriba pasarian en falso —
# el sub-patron D de metrica-decide-la-conclusion.md.
cat > "$TMP/forma-nueva.rst" <<'RST'
La primera corrida del generador fallo.
RST
NUEVO_ABS=$(cd "$RAIZ" && python3 "$GATE" --quiet "$TMP/forma-nueva.rst" 2>/dev/null)
NUEVO_REL=$(cd "$TMP" && python3 "$GATE" --quiet "forma-nueva.rst" 2>/dev/null)
afirmar "un archivo nuevo SI reporta, por ruta absoluta" "1" "$NUEVO_ABS"
afirmar "un archivo nuevo SI reporta, por ruta relativa" "1" "$NUEVO_REL"

# --- El guard del lexico: sus TRES desenlaces, no dos.
#
# Paso de un `if` sin `else` a tres ramas (2026-09-05). Un control que solo
# comprobara el camino feliz —el lexico presente— pasaria igual con la rama
# nueva y sin ella: no discriminaria. Por eso la sonda bloquea el import con un
# buscador propio en sys.meta_path, que es la unica forma de ejercitar las
# otras dos sin desinstalar el paquete del contenedor.
#
# La propiedad que se vigila NO es «instala»: es que **ninguna rama termina en
# un cero**. Si la instalacion no consigue el modulo, el guion rehusa igual que
# si nadie lo hubiera intentado.
GUARD_OUT=$(python3 - "$GATE" <<'PY' 2>&1
import importlib.util, sys

spec = importlib.util.spec_from_file_location('gate_vocab', sys.argv[1])
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

class Block:
    def find_spec(self, name, path=None, target=None):
        if name == 'spacy_lookups_data':
            raise ModuleNotFoundError(f"No module named {name!r}")
        return None

fallos = 0
if gate.require_lexicon() is None:
    fallos += 1                                  # [1] presente -> lo devuelve

sys.modules.pop('spacy_lookups_data', None)
sys.meta_path.insert(0, Block())
try:
    for etiqueta, kwargs, parche in (
            ('sin opt-in', {'auto_install': False}, None),
            ('opt-in + instalacion fallida', {'auto_install': True},
             lambda: None),
    ):
        previo = gate.install_lexicon
        if parche is not None:
            gate.install_lexicon = parche
        try:
            gate.require_lexicon(**kwargs)
            fallos += 1                          # no rehuso: fallo
        except SystemExit as e:
            if e.code != 2:
                fallos += 1
        finally:
            gate.install_lexicon = previo
finally:
    sys.meta_path[:] = [f for f in sys.meta_path if not isinstance(f, Block)]

print(f'DESENLACES_FALLIDOS={fallos}')
PY
)
GUARD_FALLOS=$(printf '%s' "$GUARD_OUT" | sed -n 's/^DESENLACES_FALLIDOS=//p')
afirmar "guard del lexico: los 3 desenlaces, ninguno termina en cero" "0" "$GUARD_FALLOS"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]

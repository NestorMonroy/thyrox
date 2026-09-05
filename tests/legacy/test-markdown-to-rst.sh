#!/usr/bin/env bash
# Prueba de `markdown_to_rst.py` — el conversor de capítulos a RST publicable.
#
# El control que importa NO es «convierte»: es que **el RST que produce
# valide**. Un conversor que emite algo parecido a RST y rompe el build no se
# distingue de uno correcto mirando su salida a ojo, así que cada caso cierra
# contra `check_rst_sintaxis.py`, que es un instrumento independiente de éste.
#
# Y el caso 6 es el control positivo con un fragmento REAL del corpus, no uno
# fabricado: `hallazgo-abierto-genera-sucesor.md` exige probar un gate contra un
# positivo conocido, porque un caso escrito por quien escribió el patrón hereda
# su encuadre y lo confirma.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CONV="$REPO/.claude/scripts/corpus/markdown_to_rst.py"
SINTAXIS="$REPO/.claude/scripts/gates/check_rst_sintaxis.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ok=0
fail=0

afirmar() {  # afirmar <descripción> <condición-ya-evaluada:0|1>
    if [ "$2" -eq 0 ]; then
        ok=$((ok + 1))
    else
        fail=$((fail + 1))
        echo "  FALLA: $1"
    fi
}

convertir() {  # convertir <markdown-en-stdin> -> imprime el RST
    cat > "$TMP/entrada.md"
    python3 "$CONV" "$TMP/entrada.md"
}

# `--strict` NO es decorativo: sin él `check_rst_sintaxis.py` **reporta** el
# error y devuelve 0 igual, así que toda aserción de validez pasaba siempre.
# Es el sub-patrón D de `metrica-decide-la-conclusion.md` —el verde que no
# discrimina— y es la razón de que el defecto del caso 10 sobreviviera a una
# suite que decía cubrir la validez del RST emitido. Ver :ref:`h-docs-392`.
valida_rst() {  # valida_rst <contenido-en-stdin>
    cat > "$TMP/salida.rst"
    python3 "$SINTAXIS" --strict "$TMP/salida.rst" >/dev/null 2>&1
}

# --- caso 1: encabezados, y el subrayado cubre las vocales acentuadas ---
salida="$(printf '# Título con acentuación\n\n## Sección\n' | convertir)"
grep -q '^=\{22\}$' <<< "$salida"; afirmar "el subrayado mide caracteres, no bytes" $?
printf '%s' "$salida" | valida_rst; afirmar "caso 1 produce RST válido" $?

# --- caso 2: la cerca de código con lenguaje desconocido cae a `text` ---
salida="$(printf '# T\n\n```klingon\nfoo()\n```\n' | convertir)"
grep -q 'code-block:: text' <<< "$salida"; afirmar "lenguaje desconocido -> text" $?
printf '%s' "$salida" | valida_rst; afirmar "caso 2 produce RST válido" $?

# --- caso 3: la tabla de tubería sale como list-table (lo que exige el gate) ---
salida="$(printf '# T\n\n| A | B |\n|---|---|\n| 1 | 2 |\n' | convertir)"
grep -q 'list-table' <<< "$salida"; afirmar "la tabla sale como list-table" $?
grep -q ':header-rows: 1' <<< "$salida"; afirmar "la primera fila es cabecera" $?
printf '%s' "$salida" | valida_rst; afirmar "caso 3 produce RST válido" $?

# --- caso 4: el markup ANIDADO se aplana; RST no lo admite ---
salida="$(printf '# T\n\nAl entrar en modo `plan` con **bold y `code` dentro**.\n' | convertir)"
grep -q '\*\*bold y code dentro\*\*' <<< "$salida"; afirmar "el literal dentro de bold se aplana" $?
grep -q '``plan``' <<< "$salida"; afirmar "el literal suelto sí conserva su marca" $?
printf '%s' "$salida" | valida_rst; afirmar "caso 4 produce RST válido" $?

# --- caso 5: el literal que empieza por espacio — el defecto que este conversor
#     tuvo, medido: `` *`` daba "Inline emphasis start-string without end-string"
salida="$(printf '# T\n\nCuando el patrón termina en ` *` (espacio más comodín).\n' | convertir)"
printf '%s' "$salida" | valida_rst
afirmar "el literal con espacio inicial no rompe el parseo" $?

# --- caso 6: CONTROL POSITIVO — un fragmento real del corpus, no fabricado ---
FUENTE="$REPO/.claude/references/harness-engineering/book/part5/ch16.md"
if [ -f "$FUENTE" ]; then
    head -120 "$FUENTE" > "$TMP/real.md"
    python3 "$CONV" "$TMP/real.md" > "$TMP/real.rst" 2>/dev/null
    python3 "$SINTAXIS" --strict "$TMP/real.rst" >/dev/null 2>&1
    afirmar "un fragmento real del corpus heng convierte y valida" $?
else
    echo "  OMITIDO: $FUENTE ausente — el control positivo no se pudo correr"
fi

# --- caso 7: la tuberia ESCAPADA dentro de una celda es contenido, no
#     separador. CONTROL POSITIVO del corpus: la fila que lo trae existe en
#     `book/part5/ch18.md` y no se fabrica aqui — quien escribe el patron no
#     puede validarlo con su propio encuadre.
CH18="$REPO/.claude/references/harness-engineering/book/part5/ch18.md"
if [ -f "$CH18" ] && grep -q '\\|' "$CH18"; then
    { printf '# T\n\n| A | B | C |\n|---|---|---|\n'
      grep -m1 '\\|' "$CH18"; } > "$TMP/tuberia.md"
    salida="$(python3 "$CONV" "$TMP/tuberia.md" 2>/dev/null)"
    printf '%s' "$salida" | valida_rst
    afirmar "una celda con tubería escapada no desalinea la list-table" $?
    grep -q 'envrc|' <<< "$salida"
    afirmar "la tubería escapada se restituye como literal en la celda" $?
else
    echo "  OMITIDO: $CH18 sin fila de tubería escapada — control no corrido"
fi

# --- caso 8: la línea en blanco DENTRO de una cerca es contenido, no separador.
#     CONTROL POSITIVO **de nuestro propio corpus**: el cuerpo sale de la
#     transcripción verbatim de la Figura 4-1 del OAIS, versionada en `source/`.
#     Es el caso real que destapó el defecto —el colapso final se comió 3 de sus
#     23 renglones— y trae la forma que discrimina: **blancas consecutivas**.
#     Una blanca suelta a media cerca sobrevive incluso sin la guarda, así que un
#     control con esa forma pasaría siempre y no mediría nada.
FIGURA="$REPO/source/gestion/pm/docs/iniciativas/automatizar-gestion-y-control-de-documentos/recommended-practice-ccsd-650.0-m-3/modelo-funcional.rst"
if [ -f "$FIGURA" ]; then
    python3 - "$FIGURA" "$TMP/cerca.md" <<'PY'
import pathlib, sys

rst = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8').splitlines()
inicio = next(i for i, l in enumerate(rst)
              if l.lstrip().startswith('.. code-block::'))
cuerpo: list[str] = []
for linea in rst[inicio + 2:]:
    if linea.strip() and not linea.startswith('   '):
        break
    cuerpo.append(linea[3:] if linea.startswith('   ') else '')
while cuerpo and not cuerpo[-1].strip():   # la blanca separadora no es cuerpo
    cuerpo.pop()

if any(not a.strip() and not b.strip() for a, b in zip(cuerpo, cuerpo[1:])):
    # El párrafo de cierre NO es decorativo: sin él la cerca queda al final del
    # documento y el `.strip()` final se come su última blanca — condición de
    # borde del archivo, no el defecto que este caso mide.
    pathlib.Path(sys.argv[2]).write_text(
        '# T\n\n```text\n' + '\n'.join(cuerpo) + '\n```\n\nCierre.\n',
        encoding='utf-8')
PY
    if [ -s "$TMP/cerca.md" ]; then
        python3 "$CONV" "$TMP/cerca.md" > "$TMP/cerca.rst" 2>/dev/null
        python3 - "$TMP/cerca.md" "$TMP/cerca.rst" <<'PY'
import pathlib, sys
md = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8').splitlines()
rst = pathlib.Path(sys.argv[2]).read_text(encoding='utf-8').splitlines()
cercas = [i for i, l in enumerate(md) if l.startswith('```')]
cuerpo_md = md[cercas[0] + 1:cercas[1]]
inicio = next(i for i, l in enumerate(rst) if l.startswith('.. code-block::'))
cuerpo_rst = [l[3:] if l.startswith('   ') else l
              for l in rst[inicio + 2:inicio + 2 + len(cuerpo_md)]]
sys.exit(0 if cuerpo_rst == cuerpo_md else 1)
PY
        afirmar "la cerca conserva sus blancas consecutivas verbatim" $?
        python3 "$SINTAXIS" --strict "$TMP/cerca.rst" >/dev/null 2>&1
        afirmar "caso 8 produce RST válido" $?
    else
        echo "  OMITIDO: la figura ya no trae blancas consecutivas — control no corrido"
    fi
else
    echo "  OMITIDO: $FIGURA ausente — el control positivo no se pudo correr"
fi

# --- caso 9: el literal en línea que el fuente parte en dos renglones.
#     `convert_inline` opera por renglón, así que la marca de apertura queda
#     huérfana y la de cierre empareja con la comilla equivocada — produciendo
#     RST **válido** que dice otra cosa. Ningún gate de sintaxis lo ve.
#     El TEXTO es real (`oais-modelo-funcional`, ya versionado); el punto de
#     corte se fabrica, porque el markdown fuente no se versiona y el corte es
#     una propiedad suya. Es la parte fabricada, y se declara.
printf '# T\n\nutilizable por la `Designated\nCommunity` a lo largo del `Long Term`.\n' \
    > "$TMP/parti.md"
salida="$(python3 "$CONV" "$TMP/parti.md" 2>/dev/null)"
grep -q '``Designated Community``' <<< "$salida"
afirmar "el literal partido en dos renglones se recompone entero" $?
grep -q '``Long Term``' <<< "$salida"
afirmar "el literal siguiente conserva su propia marca" $?
grep -qv '`Designated$' <<< "$salida"
afirmar "no queda marca de apertura huérfana al final del renglón" $?
printf '%s' "$salida" | valida_rst; afirmar "caso 9 produce RST válido" $?

# El MISMO defecto con la otra marca: `**…**` partido. Las dos se rompen igual
# porque la causa es una sola —`convert_inline` opera por renglón— y las dos
# aparecen en el mismo documento real (:ref:`h-docs-377`).
printf '# T\n\nse asume que hay varios **`Common\nServices`** disponibles. Y sigue.\n' \
    > "$TMP/negrita.md"
salida="$(python3 "$CONV" "$TMP/negrita.md" 2>/dev/null)"
grep -q '\*\*Common Services\*\*' <<< "$salida"
afirmar "el bold partido en dos renglones se recompone entero" $?
printf '%s' "$salida" | valida_rst; afirmar "caso 9-bis produce RST válido" $?

# --- caso 9-ter: el MISMO defecto DENTRO de una cita en bloque. La primera
#     corrección de H-DOCS-377 excluía todo renglón `>` de la unión, así que
#     una cita cuyo literal cruza el salto quedaba rota — y las traducciones
#     de esta campaña citan la fuente en bloque, que es donde más ocurre.
#     El TEXTO es real: es §4.2.3.3 de `oais-ingest`, ya versionado. El punto
#     de corte se fabrica, igual que en el caso 9 y por la misma razón.
printf '# T\n\n> La función `Generate Descriptive Information` extrae `Descriptive\n> Information` de los `AIP` y sigue.\n' \
    > "$TMP/cita.md"
salida="$(python3 "$CONV" "$TMP/cita.md" 2>/dev/null)"
grep -q '``Descriptive Information``' <<< "$salida"
afirmar "el literal partido DENTRO de una cita se recompone entero" $?
grep -q '``AIP``' <<< "$salida"
afirmar "el literal siguiente de la cita conserva su marca" $?
printf '%s' "$salida" | valida_rst; afirmar "caso 9-ter produce RST válido" $?

# El control que discrimina: una cita NO se funde con el párrafo que la
# precede, aunque ese párrafo deje una marca abierta. Sin esta aserción, unir
# «todo lo que siga» pasaría el caso de arriba y fundiría dos bloques.
printf '# T\n\nun párrafo con `marca\n\n> y una cita` aparte.\n' > "$TMP/cita-no.md"
salida="$(python3 "$CONV" "$TMP/cita-no.md" 2>/dev/null)"
grep -q '^   ' <<< "$salida"
afirmar "la cita sigue siendo un bloque propio, no se funde con el párrafo" $?

# La cerca NO se toca: dentro de un bloque de código una comilla suelta es
# contenido, y recomponerla ahí sería corromper la transcripción verbatim.
printf '# T\n\n```text\nsuelta `aqui\ny aca\n```\n\ncierre.\n' > "$TMP/cerca9.md"
salida="$(python3 "$CONV" "$TMP/cerca9.md" 2>/dev/null)"
grep -q '^   suelta `aqui$' <<< "$salida"
afirmar "la comilla suelta DENTRO de una cerca queda intacta" $?

# --- caso 10: el literal PEGADO a un carácter de palabra. RST exige que la
#     marca de cierre vaya seguida de espacio o puntuación; el plural español
#     —`Package Description`s— la pega a una letra y el párrafo entero se
#     pierde con "Inline literal start-string without end-string".
#     El TEXTO es real (§4.3.3.4 del OAIS, ya versionado en
#     `oais-modelo-logico-paquetes`); el plural pegado es la parte fabricada
#     —el markdown fuente no se versiona— y se declara, igual que el caso 9.
salida="$(printf '# T\n\nLos `Package Description`s describen el `AIP`, y el `AIU` normal.\n' | convertir)"
grep -q '``Package Description``\\ s' <<< "$salida"
afirmar "el literal pegado a una letra sale con espacio escapado" $?
grep -q '``AIP``,' <<< "$salida"
afirmar "el literal seguido de puntuación NO se escapa" $?
grep -q '``AIU`` normal' <<< "$salida"
afirmar "el literal seguido de espacio NO se escapa" $?
printf '%s' "$salida" | valida_rst; afirmar "caso 10 produce RST válido" $?

# El control que DISCRIMINA: la forma sin escapar tiene que fallar el gate.
# Sin esta aserción, un `valida_rst` que no distinga (el defecto que
# :ref:`h-docs-392` registra) dejaría pasar las tres de arriba sin medir nada.
printf 'T\n=\n\nLos ``Package Description``s definen el acceso.\n' > "$TMP/pegado.rst"
python3 "$SINTAXIS" --strict "$TMP/pegado.rst" >/dev/null 2>&1
[ $? -ne 0 ]; afirmar "el gate RST SÍ rechaza el literal pegado sin escapar" $?

echo "test-markdown-to-rst: $ok aserciones OK, $fail fallidas"
[ "$fail" -eq 0 ]

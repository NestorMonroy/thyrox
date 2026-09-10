#!/usr/bin/env bash
# check-hallazgo-sucesor.sh — gate de `hallazgo-abierto-genera-sucesor.md`
#
# Un hallazgo que declara alcance abierto ("Lo que este hallazgo no cierra",
# "queda abierto", "queda pendiente"…) debe nombrar su sucesor en el MISMO
# archivo: la cita durable del store (`TASK-<CAPA>-NNNN`), una sub-iniciativa
# explícita, o un DESCONOCIDO declarado con su condición de cierre.
#
# Sin sucesor, la sección abierta es deuda con buena redacción: se lee como
# rigor y funciona como olvido.
#
# Uso:
#   bash check-hallazgo-sucesor.sh                 # reporte
#   bash check-hallazgo-sucesor.sh --quiet         # sólo el conteo
#   bash check-hallazgo-sucesor.sh --strict        # exit 1 si hay incumplidores
#   bash check-hallazgo-sucesor.sh --write-baseline  # congela la deuda de ordinal
set -uo pipefail

QUIET=false; STRICT=false; ESCRIBIR=false
for a in "$@"; do
    case "$a" in
        --quiet)         QUIET=true ;;
        --strict)        STRICT=true ;;
        --write-baseline) ESCRIBIR=true ;;
    esac
done

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# La regla enumera CUATRO formas de declarar alcance abierto. Tres son de
# prosa; la cuarta —"un ``Estado:`` distinto de RESUELTO/CORREGIDO"— es
# ESTRUCTURAL, vive en el bloque ``.. meta::``, y es la que de verdad manda.
#
# Las tres primeras versiones de este gate implementaron sólo las de prosa, y
# por eso medían 5 de 83 archivos: un hallazgo que dice "Por qué no se cierra
# en este pase" y declara ``:estado: documentado`` no era ni considerado.
# Cuarto error de instrumento, el mayor de los cuatro. Ver H-DOCS-21.
#
# El estado se mide primero porque no depende de cómo esté redactado el
# cuerpo: ``documentado`` y ``parcialmente_cerrado`` SON la declaración de que
# algo queda abierto. La prosa se conserva como red secundaria, para el
# hallazgo que declare apertura sin haber puesto el estado.
ABIERTO_ESTADO='^[[:space:]]*:estado:[[:space:]]*(documentado|parcialmente_cerrado|en_curso|abierto)'
# TOLERANTE AL MARKUP a propósito: el título canónico se escribe tanto
# "Lo que este hallazgo no cierra" como "Lo que este hallazgo **no** cierra",
# y la primera versión de este gate sólo veía la forma sin negrita. Con eso
# H-API-312 se capturó por accidente —por una mención en prosa, no por su
# título— y el conteo publicado quedó sin ganar. Ver H-DOCS-18.
# (``.`` y no ``[^\n]``: en ERE la clase ``[^\n]`` excluye la letra ``n``, no el
# salto de línea — con ella "**no** cierra" quedaba fuera. grep ya opera por
# línea, así que ``.`` es lo correcto.)
#
# OCTAVO defecto de instrumento, y el más caro de los ocho porque no publicaba
# una cifra equivocada: **mataba la mitad del universo en silencio**. El `awk`
# de este contenedor es mawk 1.3.4, y su compilador de expresiones revienta con
# un cuantificador de intervalo seguido de un grupo entre paréntesis:
#
#     $ echo abcx | awk '{ if ($0 ~ /a.{0,3}(x)/) print "M" }'
#     REcompile() - panic:  values still on machine stack for a.{0,3}(x)   (exit 100)
#     $ echo abcd | awk '{ if ($0 ~ /a.{0,3}d/)   print "M" }'   ->  M      (exit 0)
#
# El intervalo solo compila; el grupo solo compila; los dos juntos, no. De las
# ocho alternativas de este patrón sólo una tenía esa forma —`queda[n]?.{0,12}
# (abiert|pendient)`— y bastaba para que la rama de prosa del universo muriera
# entera, archivo por archivo, dejando en pie sólo la rama del `:estado:`.
#
# El arreglo NO es cambiar el intervalo por `.*`: eso ensancharía el universo a
# la línea completa y cambiaría lo que el gate mide. Se distribuye la
# alternación sobre el prefijo, que preserva la cota de 12 caracteres exacta y
# deja el patrón sin ningún grupo tras un intervalo. Ver H-DOCS-1068.
ABIERTO='Lo que est[eo].{0,40}cierra|queda[n]?.{0,12}abiert|queda[n]?.{0,12}pendient|no se responde aquí|fuera de este pase|(P|p)or qué no se cierra|no se cierra en este pase|sin fix inmediato'
# Formas válidas de nombrar el sucesor (las tres de la regla).
#
# La palabra "sucesor" SUELTA no cuenta, a propósito: un hallazgo que escriba
# "el sucesor no está claro" la contiene y es exactamente el caso que el gate
# debe atrapar. Se exige el identificador —#NNN o T-NNN, una sub-iniciativa
# nombrada, o un DESCONOCIDO declarado—, no la mención.
#
# ``T-[0-9]{3}`` se añadió 2026-08-11 (quinto defecto de instrumento, misma
# familia que H-DOCS-18/21: implementar un subconjunto de las formas que la
# regla enumera). La forma 1 dice "una tarea registrada, con su ID citado en el
# propio hallazgo" — y el ID de tarea de este proyecto es **T-NNN**, no sólo
# #NNN. Medido antes de tocar el patrón: 281 IDs distintos en 44 archivos
# ``tareas-*.rst``, y 14 hallazgos que ya citaban uno. El gate los contaba como
# incumplidores. No es un relajamiento: es completar la forma que la regla ya
# definía y el repo ya usaba.
#
# ``TASK-[A-Z]+-[0-9]{4}`` se añadió 2026-09-05 (#88 / #124). Es la **cita
# durable** del store: el ordinal `#NNN` nombra una posición del board de la
# sesión —reusable, y ya reasignada— mientras que `TASK-DOCS-0385` nombra al
# sujeto. Cinco hallazgos del corpus citaban SÓLO la forma durable y el gate
# los contaba como incumplidores: era ciego justo a la cita mejor.
#
# NOVENO cambio, 2026-09-10 (cierra #113/#124): el `#NNN` a secas DEJA de
# aceptarse como sucesor nuevo. Medido en ese momento con `git log --all` sobre
# el board del cliente: 332 de 337 ordinales de la sesión anterior colisionan
# con los de ésta —se reinician y renumeran por sesión— y ninguno de los 81
# hallazgos vivos conservó el `task_id` que el store llegó a registrar. Un
# `#NNN` en un archivo YA nombra otro sujeto: es un puntero caduco, no una cita.
#
# El bloqueo de arriba ("un baseline de 985 sobre 1002 no es un baseline") era
# sobre BARRER el corpus en un solo pase. No aplica a CONGELARLO: la deuda
# heredada de citar sólo el ordinal se practica en
# `.claude/baselines/hallazgo_sucesor_baseline.txt` del repo consumidor —un
# archivo listado no bloquea, uno nuevo sí (mismo criterio prospectivo que
# `identificadores-en-ingles.md` y el resto de baselines del árbol). El
# universo se separa en dos patrones porque tienen destino distinto: el
# durable nunca necesita baseline; el ordinal sólo pasa si su archivo ya
# estaba congelado.
SUCESOR_DURABLE='TASK-[A-Z]+-[0-9]{4}|sub-iniciativa|DESCONOCIDO'
SUCESOR_ORDINAL='#[0-9]+|T-[0-9]{3}'
BASELINE=".claude/baselines/hallazgo_sucesor_baseline.txt"

# ¿Está esta ruta en el baseline (deuda de ordinal ya congelada)? Ausencia del
# archivo de baseline = conjunto vacío, no error — mismo criterio que
# `check_hallazgo_submodulo.py::leer_baseline()`.
en_baseline() {
    [[ -f "$BASELINE" ]] || return 1
    grep -qxF "$1" "$BASELINE"
}
# La sección canónica se escribe SIEMPRE, también cuando no queda nada abierto:
# "**Lo que este hallazgo no cierra:** nada del alcance declarado". Esa línea es
# un CIERRE, no una apertura — y el gate la contaba como apertura, así que exigía
# un sucesor a un hallazgo que declaraba no tener ninguno. Sexto defecto de
# instrumento, misma familia que H-DOCS-18/21: el patrón veía el encabezado y no
# la respuesta. Medido antes de tocarlo: 2 archivos usan la forma
# (H-API-386, H-API-388) y sólo el segundo caía porque el primero cita un #NNN
# por otra razón. Ver H-DOCS-118.
#
# Se descuenta POR LÍNEA, no por archivo: un hallazgo que responda "nada" en su
# sección y además diga "queda pendiente" en otro párrafo sigue contando como
# abierto. Y NO releva del ``:estado:`` estructural, que se mide aparte: para
# esquivar el gate habría que declarar además ``:estado: resuelto``, que es una
# afirmación visible y falsable, no una redacción.
CIERRE_EXPLICITO='no cierra:?\*{0,2}[[:space:]]*(nada|ninguno|ninguna)'
# SÉPTIMO defecto de instrumento, misma familia que los seis de arriba y con la
# misma forma: el patrón ve el encabezado y no la respuesta. El sexto arreglo
# cubrió el cierre **en línea** —"no cierra:** nada"— y dejó fuera el que se
# escribe como SECCIÓN, con su respuesta en el párrafo siguiente:
#
#     Lo que este hallazgo no cierra
#     ------------------------------
#
#     Nada abierto. El caso que faltaba está ahora en la suite.
#
# Descontarlo exige mirar más de una línea, así que la mitad de prosa del
# universo pasa de `grep` por línea a un recorrido con ventana. Control positivo
# real del repo: H-DOCS-439, que el gate marcaba el 2026-08-27. Ver H-DOCS-457.
#
# La ventana es de 4 líneas a propósito: cubre subrayado + blanco + la primera
# línea de la respuesta, y NO alcanza el párrafo siguiente. Una respuesta que
# empiece hablando de otra cosa y diga "nada" tres párrafos después no se
# descuenta — y está bien: entonces la sección no responde, narra.
CIERRE_SECCION='^[[:space:]]*(Nada|Ninguno|Ninguna|nada|ninguno|ninguna)([^[:alpha:]]|$)'

# GUARD DE COMPILACIÓN — el gate REHÚSA antes que publicar un cero que no midió.
#
# Los tres patrones de arriba los compila el `awk` de la máquina, no bash. Si
# alguno no compila —el defecto octavo—, cada invocación muere con exit 100 y
# stdout vacío, y el bucle de `universo()` lee esa nada como «este archivo no
# declara apertura». El conteo sale 0 y se lee como salud.
#
# Un 0 tiene que poder distinguirse de «no pude medir», que es el sub-patrón D
# de `metrica-decide-la-conclusion.md`. Se prueban los tres contra una línea
# cualquiera ANTES del barrido: si el compilador se queja, exit 2 SIN cifra.
if ! printf 'x\n' | awk -v abierto="$ABIERTO" \
                          -v inline="${CIERRE_EXPLICITO//\\/\\\\}" \
                          -v seccion="$CIERRE_SECCION" \
        '{ if ($0 ~ abierto || $0 ~ inline || $0 ~ seccion) n = 1 }' >/dev/null 2>&1; then
    echo "check-hallazgo-sucesor: ERROR — el awk de esta máquina ($(awk --version 2>&1 | head -1)) no compila alguno de los tres patrones del gate." >&2
    echo "  NO se emite un conteo: un 0 aquí sería un verde falso — mediría el silencio del compilador, no el corpus." >&2
    exit 2
fi

# Universo: un archivo declara apertura si su ESTADO lo dice, o si le queda al
# menos una línea de prosa de apertura que no sea un cierre —ni en la propia
# línea, ni en la ventana que le sigue si es un encabezado de sección.
universo() {
    grep -rlE "$ABIERTO_ESTADO" source/gestion/pm/*/iniciativas/*/hallazgos/*.rst 2>/dev/null
    for f in source/gestion/pm/*/iniciativas/*/hallazgos/*.rst; do
        [[ -f "$f" ]] || continue
        awk -v abierto="$ABIERTO" -v inline="${CIERRE_EXPLICITO//\\/\\\\}" -v seccion="$CIERRE_SECCION" '
            { linea[NR] = $0 }
            END {
                for (i = 1; i <= NR; i++) {
                    if (linea[i] !~ abierto) continue
                    if (linea[i] ~ inline) continue
                    cerrada = 0
                    for (j = i + 1; j <= i + 4 && j <= NR; j++)
                        if (linea[j] ~ seccion) { cerrada = 1; break }
                    if (!cerrada) { print "ABIERTO"; exit }
                }
            }' "$f" | grep -q ABIERTO && echo "$f"
    done
    return 0
}

# universo() recorre los 1366 archivos del glob con un `awk` por archivo, y es
# el grueso del reloj del gate: medido, 2.9 s de los 9.6 s totales POR CADA
# invocación. El camino normal lo pedía DOS veces —el bucle de incumplidores y
# el conteo de `VISTOS`— así que pagaba 5.8 s por el mismo conjunto.
#
# Se computa una sola vez. Las tres ramas leen de aquí.
#
# `emit_universe` existe para que un universo VACÍO alimente cero líneas y no
# una línea vacía: `printf '%s\n' "${arr[@]}"` sobre un arreglo sin elementos
# emite un salto, y el bucle lo leería como un archivo llamado "". Es la misma
# forma del sub-patrón D — un caso que pasa midiendo otra cosa.
#
# Los identificadores nuevos van en inglés; los heredados de este archivo
# (`universo`, `ESCRIBIR`, `INCUMPLE`…) son deuda congelada cuyo eje no tiene
# gate todavía — ningún gate de idioma recorre identificadores de shell.
mapfile -t UNIVERSE < <( universo | sort -u )
emit_universe() { ((${#UNIVERSE[@]})) && printf '%s\n' "${UNIVERSE[@]}"; return 0; }

# --write-baseline congela, de una vez, TODO archivo del universo que hoy sólo
# cita la forma caduca (ordinal, sin durable) — igual que
# `check_hallazgo_submodulo.py`: escribe el conjunto entero, no sólo lo nuevo.
if $ESCRIBIR; then
    CANDIDATOS=()
    while IFS= read -r f; do
        grep -qE "$SUCESOR_DURABLE" "$f" && continue
        grep -qE "$SUCESOR_ORDINAL" "$f" && CANDIDATOS+=("$f")
    done < <( emit_universe )
    {
        echo "# Deuda heredada de check-hallazgo-sucesor.sh — congelada, no barrida."
        echo "# Cada ruta cita sólo el ordinal (#NNN / T-NNN) como sucesor — caduco"
        echo "# frente al board de otra sesión, que reinicia y reasigna sus números."
        echo "# Una ruta listada no bloquea; una nueva SÍ. Al subir la cita a la forma"
        echo "# durable (TASK-<CAPA>-NNNN), quitar su línea: si no, el baseline miente"
        echo "# sobre deuda que ya no existe."
        printf '%s\n' "${CANDIDATOS[@]}" | sort -u
    } > "$BASELINE"
    echo "check-hallazgo-sucesor: baseline escrito — ${#CANDIDATOS[@]} ruta(s) en $BASELINE"
    exit 0
fi

INCUMPLE=()
CONGELADOS=0
while IFS= read -r f; do
    if grep -qE "$SUCESOR_DURABLE" "$f"; then
        continue
    fi
    if grep -qE "$SUCESOR_ORDINAL" "$f" && en_baseline "$f"; then
        CONGELADOS=$((CONGELADOS+1))
        continue
    fi
    INCUMPLE+=("$f")
done < <( emit_universe )

N=${#INCUMPLE[@]}
VISTOS=${#UNIVERSE[@]}
TOTAL=$(ls source/gestion/pm/*/iniciativas/*/hallazgos/hallazgo-*.rst 2>/dev/null | wc -l)

if $QUIET; then
    echo "$N"
else
    if [[ "$N" -eq 0 ]]; then
        echo "check-hallazgo-sucesor: OK — todo hallazgo con alcance abierto nombra su sucesor."
        echo "  (alcance medido: $VISTOS de $TOTAL archivos de hallazgo declaran apertura;" \
             "$CONGELADOS con ordinal congelado en baseline)"
    else
        echo "check-hallazgo-sucesor: $N hallazgo(s) declaran alcance abierto SIN sucesor:"
        printf '  %s\n' "${INCUMPLE[@]}"
        # El denominador se publica también aquí, y no sólo en la rama verde:
        # un conteo sin universo no es un resultado, y es JUSTO cuando hay
        # incumplidores cuando alguien necesita saber sobre cuántos se midió.
        echo "  (alcance medido: $VISTOS de $TOTAL archivos de hallazgo declaran apertura;" \
             "$CONGELADOS con ordinal congelado en baseline)"
        echo ""
        echo "Cada uno necesita una de las tres salidas de hallazgo-abierto-genera-sucesor.md:"
        echo "  1. la cita durable del store, TASK-<CAPA>-NNNN — el ordinal #NNN a secas"
        echo "     YA NO cuenta como sucesor nuevo (se reinicia y reasigna por sesión);"
        echo "  2. una sub-iniciativa explícita (Clausula 4 del principio rector);"
        echo "  3. un DESCONOCIDO declarado con su condición de cierre."
        echo ""
        echo "NO rellenar la sección para desbloquear el gate: si el hueco es real,"
        echo "el arreglo es registrar el sucesor, no borrar la declaración."
        echo "Si el sucesor real ES el ordinal heredado de antes de 2026-09-10, congelarlo"
        echo "con --write-baseline no basta por sí solo — confirmar que la línea aterrizó"
        echo "en $BASELINE antes de reportar el gate en verde."
    fi
fi

# Universo vacío = el gate no encontró su árbol (se corrió fuera del repo docs).
# No puede afirmar nada, así que no sale verde. Ver H-API-336.
if [[ "$TOTAL" -eq 0 ]]; then
    $QUIET || echo "check-hallazgo-sucesor: 0 archivos de hallazgo que medir — el gate no puede afirmar nada. ¿Se corrió fuera de kaupamex-docs?"
    exit 2
fi

$STRICT && [[ "$N" -gt 0 ]] && exit 1
exit 0

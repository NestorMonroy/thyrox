#!/usr/bin/env bash
# check-ids-duplicados.sh — gate de unicidad y vigencia de identificadores
#
# Origen: H-DOCS-119. Dos hallazgos distintos habían tomado el mismo ID
# porque el número siguiente se eligió mirando el archivo que se tenía
# delante, no el árbol. Un ID repetido no es cosmético: Sphinx emite
# `duplicate label` y **el `:ref:` resuelve al equivocado**, así que una cita
# apunta en silencio a otro hallazgo.
#
# Cubre DOS espacios de nombres, con instrumentos distintos porque el
# problema es distinto en cada uno:
#
#   A. Etiquetas `.. _h-<capa>-NNN:`  → duplicados dentro del árbol de docs.
#   B. Citas de tarea `#NNN`          → referencias a IDs que el board no
#                                        tiene (colgantes).
#
#   bash .claude/scripts/gates/check-ids-duplicados.sh           # reporte
#   bash .claude/scripts/gates/check-ids-duplicados.sh --quiet   # sólo el conteo
#   bash .claude/scripts/gates/check-ids-duplicados.sh --strict  # exit 1 si hay
#   bash .claude/scripts/gates/check-ids-duplicados.sh --solo-etiquetas   # sólo A
#
# LAS DOS MITADES NO SON IGUAL DE DURAS, y por eso se pueden pedir por
# separado. A mide una propiedad DEL ÁRBOL: dos etiquetas iguales son un
# defecto ahí mismo, sin depender de nada externo. B compara el árbol contra
# el tablero versionado, que a su vez es un volcado del store EFÍMERO del
# contenedor: si nadie corrió `snapshot-tasks.sh` desde la última tarea, B se
# pone roja por el rezago del volcado, no por el contenido del árbol.
#
# Consecuencia: bloquear con A es correcto siempre; bloquear con B haría que
# un push ajeno se detenga por un tablero sin regenerar. `--solo-etiquetas`
# existe para el punto de bloqueo (`pre-push`); el reporte completo sigue
# siendo el default en el `post-merge` y en la auditoría de coherencia.
set -uo pipefail

QUIET=false; STRICT=false; SOLO_ETIQ=false
for a in "$@"; do
    case "$a" in
        --quiet)  QUIET=true ;;
        --strict) STRICT=true ;;
        --solo-etiquetas) SOLO_ETIQ=true ;;
    esac
done

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# ---------------------------------------------------------------------------
# A. Etiquetas de hallazgo duplicadas
# ---------------------------------------------------------------------------
# EL ANCLA `^\.\. _` NO ES OPCIONAL. Medido en el árbol real: el patrón por
# subcadena (`_h-api-39[23]:`) devuelve 3 hits para 2 archivos — el tercero es
# la PROSA de H-DOCS-119, que cita las etiquetas entre dobles comillas
# invertidas para explicar la colisión. Un gate por subcadena marca como
# duplicado a todo hallazgo que *documente* una etiqueta, empezando por el que
# registra este defecto. La declaración de una etiqueta es una directiva a
# principio de línea; una mención es texto.
ETIQ_PAT='^\.\. _h-(api|docs|ui|db|server)-[0-9]+:'

TOTAL_ETIQ=$(grep -rhoE "$ETIQ_PAT" source/ 2>/dev/null | wc -l)
DUP_ETIQ=$(grep -rhoE "$ETIQ_PAT" source/ 2>/dev/null | sort | uniq -d)
N_ETIQ=$(printf '%s' "$DUP_ETIQ" | grep -c . || true)

# ---------------------------------------------------------------------------
# B. Citas de tarea colgantes
# ---------------------------------------------------------------------------
# El board vive en `~/.claude/tasks/<uuid>/`, efímero al contenedor. La copia
# citable es el volcado versionado que produce `snapshot-tasks.sh` (H-DOCS-121).
# Sin él este medio-gate no puede correr — y lo dice, en vez de salir verde.
BOARD='source/gestion/pm/reportes/tablero-de-tareas.rst'

# El ancla de CONTEXTO es una elección de precisión, medida:
#   - `#NNN` a secas (1-3 dígitos) → 232 IDs distintos, 2 "colgantes", de los
#     cuales uno (`#8`) es un falso positivo: sale de una enumeración de
#     maquetas de UI ("#1 login+MFA, #6-#8"), no de una cita de tarea.
#   - con ancla de contexto → 179 IDs distintos, 0 falsos positivos.
# Se elige la precisión: un gate que grita por enumeraciones se aprende a
# ignorar, y entonces no gatea nada.
CITA_PAT='(tarea|tareas|sucesor|sucesores|registrad[oa]|bloquead[oa] por|desbloquea)[^0-9#]{0,24}#\*{0,2}[0-9]{1,3}\b'

if $SOLO_ETIQ; then
    TOTAL_CITA=0; N_CITA=0; COLGANTES=''; BOARD_OK=false
elif [[ -f "$BOARD" ]]; then
    BOARD_IDS=$(grep -oE '^   \* - [0-9]+$' "$BOARD" | grep -oE '[0-9]+' | sort -u)
    CITADOS=$(grep -rhoiE "$CITA_PAT" source/ --include=*.rst 2>/dev/null \
        | grep -oE '#\*{0,2}[0-9]{1,3}\b' | grep -oE '[0-9]+' \
        | sed 's/^0*//' | grep -vE '^$' | sort -u)
    TOTAL_CITA=$(printf '%s' "$CITADOS" | grep -c . || true)
    COLGANTES=$(comm -23 <(printf '%s\n' "$CITADOS") <(printf '%s\n' "$BOARD_IDS"))
    N_CITA=$(printf '%s' "$COLGANTES" | grep -c . || true)
    BOARD_OK=true
else
    TOTAL_CITA=0; N_CITA=0; COLGANTES=''; BOARD_OK=false
fi

N=$(( N_ETIQ + N_CITA ))

if $QUIET; then
    echo "$N"
else
    echo "check-ids-duplicados:"
    echo "  A. etiquetas de hallazgo duplicadas: $N_ETIQ (alcance medido: $TOTAL_ETIQ etiquetas declaradas)"
    # `sed`, no `printf '%s\n' $DUP_ETIQ`: cada duplicado es la directiva
    # entera (`.. _h-api-621:`) y el sin-comillas la parte en dos por el
    # espacio — cinco colisiones se imprimían como diez renglones, la mitad
    # de ellos un `..` suelto.
    [[ -n "$DUP_ETIQ" ]] && sed 's/^/     /' <<< "$DUP_ETIQ"
    if $BOARD_OK; then
        echo "  B. citas de tarea colgantes: $N_CITA (alcance medido: $TOTAL_CITA IDs citados con ancla de contexto)"
        [[ -n "$COLGANTES" ]] && printf '     #%s citado y ausente del board\n' $COLGANTES
    elif $SOLO_ETIQ; then
        echo "  B. citas de tarea: NO MEDIDA — se pidió --solo-etiquetas"
    else
        echo "  B. citas de tarea: SIN MEDIR — falta $BOARD (correr snapshot-tasks.sh)"
    fi
    echo ""
    echo "  Métrica: unicidad de la DECLARACIÓN de etiqueta, y existencia del ID citado."
    echo "  Ciega a: (1) que la cita apunte al ID equivocado. El board REESCRIBE"
    echo "           IDs: medido en el transcript, #205 se repropuso por TaskUpdate"
    echo "           a otro tema y #206..#209 se borraron (H-DOCS-125). La cita"
    echo "           borrada avisa al fallar; la repropuesta RESUELVE, al destino"
    echo "           equivocado, y nadie la nota. Es semántico: ningún patrón lo ve."
    echo "           (2) las citas sin ancla de contexto: de 1639 apariciones de"
    echo "           #NNN en el árbol, el patrón ve 463. Residual conocida: el par"
    echo "           #205/#206 en 4 artefactos FECHADOS, conservados a propósito."
fi

# Universo vacío = el gate se corrió fuera del árbol de docs y no puede
# afirmar nada. No sale verde. Ver H-API-336.
if [[ "$TOTAL_ETIQ" -eq 0 ]]; then
    $QUIET || echo "check-ids-duplicados: 0 etiquetas que medir — ¿se corrió fuera de kaupamex-docs?"
    exit 2
fi

$STRICT && [[ "$N" -gt 0 ]] && exit 1
exit 0

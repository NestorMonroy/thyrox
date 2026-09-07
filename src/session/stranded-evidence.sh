#!/usr/bin/env bash
# stranded-evidence.sh — el grifo de "la evidencia no nace en un directorio
# volátil" (tarea #910, :ref:`h-docs-456`).
#
# Por qué existe
# --------------
# El triaje de #858 preservó 37 artefactos únicos que vivían sólo en un
# directorio volátil, y declaró 11 más recuperables por su blob. Fue un pase:
# nada impedía que al día siguiente volviera a haber sondas sueltas ahí. La
# regla existía —la evidencia vive en `.claude/eventos/**`— y su forma
# ejecutable no. `gitlink-bump-gate.md` ya dejó dicho por qué eso no basta:
# *"La lección escrita no previene la reincidencia. Solo un gate ejecutable
# integrado en el flujo lo hace."*
#
# Por qué al CIERRE del turno y no en cada escritura
# --------------------------------------------------
# La tarea proponía un `PostToolUse` que avisara al escribir. Su precondición
# —medir cuántas escrituras legítimas hay— dio el veredicto contrario: un
# aviso por escritura dispararía más de cien veces por sesión, y un aviso que
# sale cien veces se aprende a ignorar. La medición vive en
# `.claude/eventos/medicion-escrituras-tmp-*/`.
#
# Al cierre del turno el universo es otro: no las invocaciones, sino los
# archivos que QUEDARON. Y con el marcador de asentado, sólo los que
# aparecieron desde el último triaje. Eso convierte cien avisos en uno, y
# llega cuando la decisión todavía es barata.
#
# Uso
#   bash .claude/scripts/session/stranded-evidence.sh listar          # 0 limpio · 1 hay · 2 no medible
#   bash .claude/scripts/session/stranded-evidence.sh olvidar <ruta>  # declararla efímera
#   bash .claude/scripts/session/stranded-evidence.sh asentar         # marcar lo actual como triado
set -uo pipefail

VOLATIL="${EV_VOLATIL:-/tmp}"
LEDGER="${EV_LEDGER:-/tmp/kaupamex-evidencia-$(id -u)}"
MARCADOR="$LEDGER/asentado"
DESCARTADOS="$LEDGER/descartados"

# Extensiones que cuentan como ARTEFACTO, no como volcado. La partición sale
# de medir la sesión, no de intuición: `.txt` (187 destinos únicos) y `.log`
# (98) son volcados por naturaleza —su sitio ES un directorio volátil— y
# marcarlos ahogaría la señal. `.py` (76) y `.rst` (14) son las dos formas que
# el triaje de #858 tuvo que preservar de verdad; `.tsv` es su censo.
ARTEFACTOS=(py rst tsv)

# El barrido NO acota la profundidad, y la razón es una medición: un tope de 6
# habría visto 515 de los 582 archivos que hay, dejando fuera 67 sin decirlo —
# el mismo defecto que el triaje de #858 cometió al medir sólo profundidad 2 y
# publicar sus 48 como si fueran el universo (:ref:`h-docs-458`).
#
# Cuántas líneas se imprimen sí está acotado: un bloqueo que vuelca quinientas
# rutas no informa, satura.
TOPE_REPORTE=15

mkdir -p "$LEDGER"
touch "$DESCARTADOS"

hallar() {
    local expression=() ext
    for ext in "${ARTEFACTOS[@]}"; do
        expression+=(-o -name "*.$ext")
    done
    # El primer -o sobra; se descarta con el recorte de abajo.
    find "$VOLATIL" -type f \
        \( "${expression[@]:1}" \) \
        -not -path "$LEDGER/*" \
        "$@" 2>/dev/null | sort
}

listar() {
    # Sin directorio que medir el gate NO afirma nada. Un 0 aquí sería un
    # verde que no distingue "no hay varados" de "no pude mirar" — el
    # sub-patrón D de `metrica-decide-la-conclusion.md`.
    if [[ ! -d "$VOLATIL" ]]; then
        echo "stranded-evidence: '$VOLATIL' no existe — el gate no puede afirmar nada." >&2
        return 2
    fi

    local all new
    all=$(hallar)
    if [[ -f "$MARCADOR" ]]; then
        new=$(hallar -newer "$MARCADOR")
    else
        new="$all"
    fi

    # Lo declarado efímero se suelta, igual que `wait-jobs.sh forget`.
    local stranded=()
    while IFS= read -r ruta; do
        [[ -n "$ruta" ]] || continue
        grep -Fxq "$ruta" "$DESCARTADOS" && continue
        stranded+=("$ruta")
    done <<< "$new"

    local universe
    universe=$(grep -c . <<< "$all")
    [[ -n "$all" ]] || universe=0

    if [[ "${#stranded[@]}" -eq 0 ]]; then
        echo "stranded-evidence: OK — ningún artefacto nuevo varado en '$VOLATIL'."
        echo "  (alcance medido: $universe archivo(s) ${ARTEFACTOS[*]} bajo '$VOLATIL', sin tope de profundidad)"
        return 0
    fi

    echo "stranded-evidence: ${#stranded[@]} artefacto(s) viven SÓLO en un directorio volátil:"
    printf '  %s\n' "${stranded[@]:0:$TOPE_REPORTE}"
    if [[ "${#stranded[@]}" -gt "$TOPE_REPORTE" ]]; then
        echo "  … y $(( ${#stranded[@]} - TOPE_REPORTE )) más (el reporte se acota; el conteo no)"
    fi
    # El denominador también aquí, no sólo en la rama verde: es justo cuando
    # hay incumplidores cuando alguien necesita saber sobre cuántos se midió.
    echo "  (alcance medido: $universe archivo(s) ${ARTEFACTOS[*]} bajo '$VOLATIL', sin tope de profundidad)"
    return 1
}

case "${1:-listar}" in
    listar)
        listar
        exit $?
        ;;
    olvidar)
        [[ $# -ge 2 ]] || { echo "uso: $0 olvidar <ruta>" >&2; exit 64; }
        shift
        printf '%s\n' "$@" >> "$DESCARTADOS"
        echo "stranded-evidence: soltado(s) $# archivo(s)."
        ;;
    asentar)
        touch "$MARCADOR"
        echo "stranded-evidence: asentado — lo actual no vuelve a avisar."
        ;;
    *)
        echo "uso: $0 {listar|olvidar <ruta>|asentar}" >&2
        exit 64
        ;;
esac

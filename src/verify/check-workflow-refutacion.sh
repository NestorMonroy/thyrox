#!/usr/bin/env bash
# check-workflow-refutacion.sh — gate #10: un guion que ESCRIBE código refuta
#
# Origen: :ref:`h-docs-101`. De los cinco guiones de `.claude/workflows/`, sólo
# los dos primeros tenían fase `Refutar`; los tres nuevos la perdieron al
# escribirse. La prosa de `bash-background-tasks.md` no lo evitó — es el caso
# que `gitlink-bump-gate.md` describe: *"la lección escrita no previene la
# reincidencia; sólo un gate ejecutable integrado en el flujo lo hace"*.
#
# Qué exige: si los agentes de un guion escriben en el árbol de código, el
# guion declara una fase que MIDE el disco con un instrumento distinto del
# auto-reporte del agente que escribió. Sin ella, `simbolos_portados` y
# `simbolos_referencia` los pone el mismo agente y compararlos no verifica
# nada — así wf_cbf5573c-bf0 dio por bueno un porte de 3 archivos de 12
# (:ref:`h-api-377`).
#
#   bash .claude/scripts/gates/check-workflow-refutacion.sh           # reporte
#   bash .claude/scripts/gates/check-workflow-refutacion.sh --quiet   # sólo el conteo
#   bash .claude/scripts/gates/check-workflow-refutacion.sh --strict  # exit 1 si incumple
set -uo pipefail

QUIET=false; STRICT=false
for a in "$@"; do
    case "$a" in
        --quiet)  QUIET=true ;;
        --strict) STRICT=true ;;
    esac
done

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# ---------------------------------------------------------------------------
# Por qué DECLARADO y no inferido
# ---------------------------------------------------------------------------
# Se midieron tres discriminadores textuales sobre los cinco guiones reales —
# `git add`, `archivos_escritos|escrib`, `NO portes nada` — y NINGUNO separa a
# los que escriben de los que sólo emiten veredictos: el guion de veredictos
# también prohíbe `git add` a sus agentes, y también dice "escribió" en un
# comentario. Un patrón así habría publicado un cero mientras el defecto
# seguía ahí, que es la forma de fallo que este repo ya registró cuatro veces
# (H-DOCS-18, H-DOCS-21).
#
# Así que el guion lo DECLARA, en un comentario-pragma sin efecto en tiempo de
# ejecución (no toca `meta`, que la plataforma valida):
#
#     // @escribe-codigo: si    ← sus agentes escriben en el árbol; exige Refutar
#     // @escribe-codigo: no    ← sólo mide o emite veredictos; exento
#
# **Omitirlo también incumple.** "Sin declarar" no es "no escribe": si el
# silencio eximiera, el gate premiaría al guion que nadie anotó — justo el
# recién escrito, que es el que reincidió.

# El valor puede llevar prosa detrás en la misma línea — así están escritas las
# cinco declaraciones reales. La primera versión de este patrón anclaba con
# `$` justo tras el valor y midió 0 de 5: quinto fallo de instrumento de la
# serie, atrapado por probar contra los guiones del repo en vez de contra uno
# fabricado. `\b` evita además que `si` case dentro de `sin declarar`.
PRAGMA='^[[:space:]]*//[[:space:]]*@escribe-codigo:[[:space:]]*(si|sí|no)\b'

# ---------------------------------------------------------------------------
# Qué se exige: una fase que mida y ABORTE — DECLARADA, no inferida (#227)
# ---------------------------------------------------------------------------
# La versión anterior exigía literalmente `phase('Refutar')` y salía verde sobre
# los cuatro guiones que escriben. Ese verde tapaba el sub-patrón A de
# `metrica-decide-la-conclusion.md`: un encabezado sobre dos mecanismos.
#
# Pero mirar el `throw` DENTRO del bloque llamado Refutar/Verificar tampoco
# sirve, y por una razón medida: el aborto de verificación vive en fases
# distintas según el guion.
#
#   guion                          fase que re-mide y ABORTA
#   completar-cascara                Refutar     (2 throw)
#   portar-capa                      Refutar     (2)  y Consolidar (2)
#   satelites-sin-dependencia        Consolidar  (2)  ← registro, migraciones, pytest
#   satelites-muestra-diagnostica    NINGUNA          ← ni siquiera tiene Consolidar
#
# El tercero es un guion CORRECTO que un patrón por nombre marcaría en falso: su
# `Refutar` no aborta —y no debe, el canon lo define así— pero su `Consolidar`
# corre la suite y lanza si algo queda inerte. El cuarto es el incumplidor real.
#
# Se probaron además dos heurísticas para inferirlo sin declarar —`throw` tras
# la fase de escritura, y `throw` sobre un campo del resultado vs sobre un
# agente muerto— y NINGUNA separa: la segunda da >=3 en los cuatro que escriben
# y también en el exento. Mismo desenlace que el discriminador de "quién
# escribe" (arriba), y misma conclusión: se DECLARA.
#
#     // @verifica-en: Consolidar   ← la fase que re-mide el disco y aborta
#
# **Omitirlo también incumple**, por el mismo motivo que el primer pragma.
PRAGMA_VERIF='^[[:space:]]*//[[:space:]]*@verifica-en:[[:space:]]*([A-Za-zÁ-ú]+)'

DIR=".claude/workflows"
mapfile -t GUIONES < <(ls "$DIR"/*.js 2>/dev/null)
TOTAL=${#GUIONES[@]}

INCUMPLE=(); ESCRIBEN=0; EXENTOS=0
for f in "${GUIONES[@]}"; do
    VAL=$(grep -oiE "$PRAGMA" "$f" 2>/dev/null | head -1 \
          | sed -E 's/.*@escribe-codigo:[[:space:]]*//' | tr -d '[:space:]')
    case "${VAL,,}" in
        no)
            EXENTOS=$((EXENTOS+1)) ;;
        si|sí)
            ESCRIBEN=$((ESCRIBEN+1))
            FASE=$(grep -oE "$PRAGMA_VERIF" "$f" 2>/dev/null | head -1 \
                   | sed -E 's/.*@verifica-en:[[:space:]]*//' | tr -d '[:space:]')
            if [[ -z "$FASE" ]]; then
                INCUMPLE+=("$f — escribe y no declara @verifica-en: <Fase>")
            else
                # Bloque de esa fase: desde su `phase(` hasta el siguiente.
                # ERE NATIVO de awk: `[(]`, no `\(` — gawk degrada el escape a
                # paréntesis literal con warning y el patrón no casa. Sexto fallo
                # de instrumento de la serie, atrapado porque había una cifra
                # esperada (2) contra la que comparar el 4 que salió.
                BLOQUE=$(awk -v pat="^phase[(]'$FASE'[)]" '
                    $0 ~ pat              { dentro=1; print; next }
                    dentro && /^phase[(]/ { dentro=0 }
                    dentro                { print }' "$f")
                if [[ -z "$BLOQUE" ]]; then
                    INCUMPLE+=("$f — declara @verifica-en: $FASE y esa fase NO existe")
                elif ! grep -q "throw " <<<"$BLOQUE"; then
                    INCUMPLE+=("$f — su fase $FASE mide y NO aborta: entrega igual (H-API-377)")
                fi
            fi ;;
        *)
            INCUMPLE+=("$f — sin declarar @escribe-codigo") ;;
    esac
done

N=${#INCUMPLE[@]}

if $QUIET; then
    echo "$N"
else
    if [[ "$N" -eq 0 ]]; then
        echo "check-workflow-refutacion: OK — todo guion que escribe código declara su fase de refutación."
        echo "  (alcance medido: $TOTAL guiones · $ESCRIBEN escriben · $EXENTOS exentos)"
    else
        echo "check-workflow-refutacion: $N guion(es) incumplen:"
        printf '  %s\n' "${INCUMPLE[@]}"
        echo "  (alcance medido: $TOTAL guiones · $ESCRIBEN escriben · $EXENTOS exentos)"
        echo ""
        echo "Un guion cuyos agentes escriben necesita una fase que mida el DISCO con un"
        echo "instrumento distinto del auto-reporte del agente que escribió. El patrón"
        echo "está en completar-cascara.js y portar-capa-del-mapa-de-dependencias.js:"
        echo "  phase('Medir')                — línea base por AST antes del porte"
        echo "  phase('Refutar'|'Verificar')  — la misma medición después, y **throw**"
        echo "                                   si el delta es <= 0"
        echo ""
        echo "La fase que verifica se DECLARA — puede ser Consolidar, si es ahí donde el"
        echo "guion corre la suite y aborta:"
        echo "  // @verifica-en: Consolidar — corre registro + pytest y lanza si queda inerte"
        echo ""
        echo "No basta con medir y registrar el veredicto: si la fase sólo hace log() y"
        echo "return, el guion entrega igual aunque la verificación salga mal (H-API-377)." 
        echo ""
        echo "Si el guion NO escribe (sólo mide o emite veredictos), declararlo:"
        echo "  // @escribe-codigo: no"
    fi
fi

# Universo vacío = el gate no encontró su árbol. No puede afirmar nada, así que
# no sale verde (H-API-336).
if [[ "$TOTAL" -eq 0 ]]; then
    $QUIET || echo "check-workflow-refutacion: 0 guiones que medir en $DIR — ¿se corrió fuera de kaupamex-docs?"
    exit 2
fi

$STRICT && [[ "$N" -gt 0 ]] && exit 1
exit 0

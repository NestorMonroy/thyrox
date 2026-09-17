#!/bin/bash
# ¿Quien se comio el disco? — el reparto, con cota y con el corte declarado.
#
# La otra mitad de `disk-headroom.sh`: aquel dice cual es el techo real, este
# dice quien lo ocupa. Juntos cubren lo que `pack_headroom.py` se declara
# ciega a ver — de donde sale el disco libre que da por bueno.
#
# Por que no basta `du -x -h --max-depth=2 | sort -h | tail`
# ----------------------------------------------------------
#
# Tres defectos, los tres medidos al escribir esto:
#
#   1. **`tail` oculta el reparto largo.** Medido sobre `/tmp`: los doce mayores
#      hijos suman ~450 MiB de un total de 4506 MiB. El resto no es un archivo
#      grande escondido — son **123 504 directorios** de nivel 1. Un `tail -12`
#      publica «no hay nada grande» sobre un arbol cuyo problema es el numero de
#      entradas, no el tamaño de ninguna.
#   2. **No declara el corte.** Un recorrido que agota su plazo imprime una
#      lista parcial y termina en 0. Entonces «no aparece» y «no dio tiempo a
#      mirarlo» son la misma salida — el sub-patron D de
#      `metrica-decide-la-conclusion.md`.
#   3. **No poda.** `.git`, `node_modules` y los cachés de build dominan el
#      conteo de entradas sin ser lo que se busca.
#
# Las salidas son tres, y por que
# --------------------------------
#
# ``0`` recorrido COMPLETO dentro del plazo.
# ``3`` PARCIAL: el plazo vencio; lo impreso es una cota inferior.
# ``2`` rehusa: ninguna raiz existe; **no se emite cifra**.
#
# *Métrica:* `du -x` (un solo sistema de archivos) sobre las raices dadas,
# excluyendo las podas, bajo un plazo de pared.
# *Ciega a:* el espacio que retiene un descriptor abierto sobre un archivo ya
# borrado — eso lo mide `disk-headroom.sh`; a los enlaces duros, que `du`
# cuenta una vez y hacen que la suma de las partes sea menor que el todo; y a
# la diferencia entre tamaño aparente y bloques ocupados en archivos dispersos.

set -uo pipefail

REFUSAL=2

#: `du --max-depth=N` imprime una linea por ANCESTRO cuyo tamaño YA contiene el
#: de sus descendientes. La linea de la raiz ES el total; sumarla junto a sus
#: hijos cuenta dos veces cada byte que vive en un hijo. Se declara como
#: constante para que el control pueda **anularla**: sumando todas las lineas,
#: el total deja de coincidir con `du -s` y cae exactamente el caso que lo mide.
THYROX_TEST_ROOT_IS_TOTAL=1

#: Declarar que el recorrido se corto es lo unico que separa «no hay nada» de
#: «no dio tiempo a mirar». Se declara como constante para que el control pueda
#: **anularla**: el caso del plazo vencido es el unico que la mide.
THYROX_TEST_DECLARE_CUT=1

#: Raices de ruido: dominan el conteo de entradas y nunca son la respuesta.
#: `.cache` y `_references` NO estan aqui a proposito — son sujeto de analisis
#: en este arbol, no volumen que estorbe (mismo criterio que `bounded_scan`).
DEFAULT_PRUNE=(.git node_modules .venv __pycache__ .mypy_cache .pytest_cache
               .next .nuxt dist build target .gradle)

roots=()
depth=2
top=20
deadline=240
extra_prune=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --depth)   depth="$2";    shift 2 ;;
        --top)     top="$2";      shift 2 ;;
        --timeout) deadline="$2"; shift 2 ;;
        --prune)   extra_prune+=("$2"); shift 2 ;;
        -h|--help) sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        -*) printf 'ERROR — opcion desconocida: %s\n' "$1" >&2; exit "$REFUSAL" ;;
        *)  roots+=("$1"); shift ;;
    esac
done
[[ ${#roots[@]} -gt 0 ]] || roots=(.)

refuse() {
    # Sin cifra: un cero aqui se leeria como «esa raiz no ocupa nada», que es
    # otra afirmacion. Rehusar y medir cero tienen que ser distinguibles.
    printf 'ERROR — %s; no se emite medicion.\n' "$1" >&2
    exit "$REFUSAL"
}

present=()
for root in "${roots[@]}"; do
    [[ -e "$root" ]] && present+=("$root")
done
[[ ${#present[@]} -gt 0 ]] || refuse "ninguna de las raices dadas existe"

exclude_args=()
for name in "${DEFAULT_PRUNE[@]}" "${extra_prune[@]}"; do
    exclude_args+=(--exclude="$name")
done

raw=$(timeout "$deadline" du -x --max-depth="$depth" "${exclude_args[@]}" \
        "${present[@]}" 2>/dev/null)
du_status=$?

cut_short=0
if [[ $du_status -eq 124 ]]; then
    cut_short=1
fi

printf 'raices            %s\n' "${present[*]}"
printf 'poda              %s\n' "${DEFAULT_PRUNE[*]} ${extra_prune[*]}"
printf 'profundidad       %s   · plazo %ss   · mostrando los %s mayores\n' \
    "$depth" "$deadline" "$top"
printf -- '---\n'

# Las raices se marcan por su ruta exacta y se separan con el TABULADOR que
# `du` emite, no por subcadena: una ruta con espacios sobrevive, y `/home` no
# casa con `/homework`.
# Las marcas viajan por el mismo flujo, con el tabulador que `du` ya emite: una
# ruta con espacios sobrevive, y `/home` no casa con `/homework`.
con_marcas() { printf '@ROOT@\t%s\n' "${present[@]}"; printf '%s\n' "$raw"; }

con_marcas | awk -F'\t' -v solo_hijos="$THYROX_TEST_ROOT_IS_TOTAL" '
        $1 == "@ROOT@" { es_raiz[$2] = 1; next }
        { if (solo_hijos == "1" && ($2 in es_raiz)) next; print }' \
    | sort -k1,1nr \
    | head -n "$top" \
    | awk -F'\t' '{ printf "%10.1f MiB  %s\n", $1/1024, $2 }'

printf -- '---\n'
con_marcas | awk -F'\t' -v raiz_es_total="$THYROX_TEST_ROOT_IS_TOTAL" '
    $1 == "@ROOT@" { es_raiz[$2] = 1; next }
    {
        if (raiz_es_total == "1") { if ($2 in es_raiz) total += $1; else hijos++ }
        else                      { total += $1; hijos++ }
    }
    END { printf "%d entradas medidas, %.1f MiB en total\n", hijos, total/1024 }'

if [[ $cut_short -eq 1 && "$THYROX_TEST_DECLARE_CUT" == "1" ]]; then
    printf 'VEREDICTO         PARCIAL — el plazo de %ss vencio.\n' "$deadline"
    printf '  Lo impreso es una COTA INFERIOR: subir --timeout o bajar --depth.\n'
    exit 3
fi

printf 'VEREDICTO         COMPLETO\n'
exit 0

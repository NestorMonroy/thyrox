#!/usr/bin/env bash
# Universo controlado para graph_metrics.py — respuesta derivada a mano.
#
# El fixture está construido para que las dos centralidades DISCREPEN, que es
# la propiedad por la que el guion existe. Si un cambio las hiciera coincidir,
# el guion habría dejado de aportar y este test lo dice.
#
#   a -> h      h es sumidero: tres nodos dependen de él y ningún camino lo
#   b -> h      atraviesa, porque no sale nada de él.
#   c -> h
#   x -> p      p es puente: el único camino de x a y pasa por él, y sólo un
#   p -> y      nodo depende de p directamente.
#
# Derivado a mano:
#   nodos              a b c h x p y = 7
#   grado de entrada   h = 3   ·   p = 1   -> gana h
#   intermediación     h = 0   ·   p = 1   -> gana p
#
# Ésa es toda la tesis: el grado premia al que todos usan (que suele estar ya
# hecho) y la intermediación destapa al que está en medio del camino.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

GUION=.claude/scripts/graph/graph_metrics.py
FIXTURE=$(mktemp)
trap 'rm -f "$FIXTURE"' EXIT
cat > "$FIXTURE" <<'ARISTAS'
# origen destino
a h
b h
c h
x p
p y
ARISTAS

fallos=0
aserciones=0

afirmar() {
    local descripcion="$1" esperado="$2" obtenido="$3"
    aserciones=$((aserciones + 1))
    if [[ "$obtenido" == "$esperado" ]]; then
        printf '  ok   %s\n' "$descripcion"
    else
        printf '  FALLA %s\n       esperado: %s\n       obtenido: %s\n' \
            "$descripcion" "$esperado" "$obtenido"
        fallos=$((fallos + 1))
    fi
}

salida=$(python3 "$GUION" --edges "$FIXTURE" --top 10 --json 2>&1)
rc=$?
afirmar "el guion sale 0 sobre el fixture" "0" "$rc"

leer() { printf '%s' "$salida" | python3 -c "import json,sys; print($1)"; }

afirmar "cuenta los 7 nodos del fixture" "7" "$(leer 'json.load(sys.stdin)["nodes"]')"
afirmar "cuenta las 5 aristas del fixture" "5" "$(leer 'json.load(sys.stdin)["edges"]')"

# El control positivo: las dos centralidades eligen nodos distintos.
afirmar "el grado de entrada corona a h (el que todos usan)" \
    "h 3" "$(leer '" ".join(map(str, json.load(sys.stdin)["in_degree"][0]))')"
afirmar "la intermediación corona a p (el puente)" \
    "p 1.0" "$(leer '" ".join(map(str, json.load(sys.stdin)["betweenness"][0]))')"

# Y h no tiene intermediación: es sumidero, ningún camino lo atraviesa.
afirmar "h tiene intermediación 0 — es sumidero, no puente" "0.0" \
    "$(leer 'str(dict(json.load(sys.stdin)["betweenness"]).get("h", "ausente"))'
       )"

# La agrupación separa los dos componentes desconectados del fixture.
afirmar "markovClustering separa los dos componentes" "2" \
    "$(leer 'len(json.load(sys.stdin)["communities"])')"

# La invariante de la poda: `--prune 0` NO poda nada, así que reproduce la
# implementación densa por construcción. El default sólo es legítimo si da la
# MISMA partición — si un cambio la moviera, habría comprado velocidad a
# cambio de otra respuesta, que es lo que este caso impide.
sin_podar=$(python3 "$GUION" --edges "$FIXTURE" --prune 0 --json 2>&1 \
    | python3 -c 'import json,sys; print(sorted(map(sorted, json.load(sys.stdin)["communities"])))')
por_defecto=$(printf '%s' "$salida" \
    | python3 -c 'import json,sys; print(sorted(map(sorted, json.load(sys.stdin)["communities"])))')
afirmar "la poda por defecto da la misma partición que --prune 0 (la densa)" \
    "$sin_podar" "$por_defecto"

# Un grafo vacío no se inventa un resultado: sale 1 y lo dice.
python3 "$GUION" --edges /dev/null >/dev/null 2>&1
afirmar "un archivo de aristas vacío sale 1, no 0" "1" "$?"

# Una línea mal formada aborta en vez de descartarla en silencio.
MALO=$(mktemp); trap 'rm -f "$FIXTURE" "$MALO"' EXIT
printf 'a b c\n' > "$MALO"
python3 "$GUION" --edges "$MALO" >/dev/null 2>&1
afirmar "una línea de 3 campos aborta, no se descarta callando" "1" "$?"

printf '\n%d aserciones · %d fallo(s)\n' "$aserciones" "$fallos"
[[ $fallos -eq 0 ]]

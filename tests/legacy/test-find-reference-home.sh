#!/usr/bin/env bash
# Universo controlado para la llave 4 (símbolos) de find_reference_home.py.
#
# La llave existe para el addon que PARTICIONA uno de la referencia: renombra
# sus archivos a vocabulario propio, así que las llaves de nombre fallan por
# construcción y lo único que conserva son los métodos.
#
# El fixture se construye con la respuesta derivada a mano:
#
#   nuestro addon declara 4 símbolos:  alfa · beta · gamma · save
#
#   ref/models/target.py   declara alfa, beta, gamma   -> 3 útiles
#   ref/models/other.py    declara gamma               -> 1 útil
#   ref/noise01..45.py     declaran save               -> 0 útiles
#
#   `save` aparece en 45 archivos > el corte de 40, así que se retira por
#   ubicuo y los 45 de ruido NO entran al ranking. Ése es el punto: sin el
#   corte, el ruido sepultaría al hogar verdadero.
#
# Y lleva el caso de regresión del defecto que costó un falso cero: `git grep
# -E` es POSIX ERE, no PCRE. Un patrón con `\s` o `(?:...)` no da error — da
# CERO aciertos, y un instrumento mudo se lee como un árbol sin contraparte.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

GUION=.claude/scripts/corpus/find_reference_home.py
TRABAJO=$(mktemp -d)
trap 'rm -rf "$TRABAJO"' EXIT

# --- la referencia sintética -------------------------------------------------
REF="$TRABAJO/referencia"
mkdir -p "$REF/ref/models"
cat > "$REF/ref/models/target.py" <<'PY'
class Target:
    def alfa(self):
        return 1

    def beta(self, x):
        return x

    async def gamma(self):
        return None
PY
cat > "$REF/ref/models/other.py" <<'PY'
class Other:
    def gamma(self):
        return 2
PY
for n in $(seq -w 1 45); do
    printf 'class Noise:\n    def save(self):\n        return %s\n' "$n" \
        > "$REF/ref/noise$n.py"
done
git -C "$REF" init -q
git -C "$REF" -c user.email=t@t -c user.name=t add -A
git -C "$REF" -c user.email=t@t -c user.name=t commit -q -m "universo controlado"

# --- nuestro addon -----------------------------------------------------------
MIO="$TRABAJO/mio"
mkdir -p "$MIO"
cat > "$MIO/serializers.py" <<'PY'
class Nuestro:
    def alfa(self):
        return 1

    def beta(self, x):
        return x

    def gamma(self):
        return None

    def save(self):
        return None
PY

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

salida=$(python3 "$GUION" --ours "$MIO" --reference "$REF" --symbols --top 5 2>&1)
rc=$?
afirmar "el guion sale 0 sobre el fixture" "0" "$rc"

afirmar "mide los 4 símbolos que el addon declara" "1" \
    "$(printf '%s' "$salida" | grep -c 'símbolos nuestros medidos: 4')"

# El corte de ubicuidad: save está en 45 archivos, por encima del default 40.
afirmar "retira save por ubicuo (45 archivos > 40)" "1" \
    "$(printf '%s' "$salida" | grep -c 'retirados por ubicuos (>40 archivos): save')"

# El control positivo: el hogar verdadero encabeza con sus 3 símbolos.
afirmar "target.py encabeza el ranking con 3 símbolos útiles" \
    "3 · ref/models/target.py" \
    "$(printf '%s' "$salida" | grep -oE '[0-9]+ · ref/models/target\.py' | head -1)"

afirmar "other.py queda segundo con 1" \
    "1 · ref/models/other.py" \
    "$(printf '%s' "$salida" | grep -oE '[0-9]+ · ref/models/other\.py' | head -1)"

# Los 45 de ruido sólo declaran el ubicuo: no deben entrar al ranking.
afirmar "los 45 archivos de ruido NO entran al ranking" "0" \
    "$(printf '%s' "$salida" | grep -c 'ref/noise')"

# Regresión del falso cero: si alguien reintroduce \s o (?:...) en el patrón
# que va a `git grep -E`, el ranking sale vacío y esta aserción lo dice.
afirmar "el ranking NO está vacío — el patrón POSIX acierta" "0" \
    "$(printf '%s' "$salida" | grep -c 'ningún archivo de la referencia declara')"

# `async def` cuenta igual que `def`: gamma es async en target.py.
afirmar "cuenta gamma aunque se declare async" "1" \
    "$(printf '%s' "$salida" | grep -A1 'ref/models/target\.py' | grep -c 'gamma')"

# El corte se puede mover: con el umbral en 50, save deja de ser ubicuo.
otra=$(python3 "$GUION" --ours "$MIO" --reference "$REF" --symbols \
    --ubiquity 50 --top 60 2>&1)
afirmar "con --ubiquity 50 save deja de retirarse y el ruido aparece" "45" \
    "$(printf '%s' "$otra" | grep -c 'ref/noise')"

printf '\n%d aserciones · %d fallo(s)\n' "$aserciones" "$fallos"
[[ $fallos -eq 0 ]]

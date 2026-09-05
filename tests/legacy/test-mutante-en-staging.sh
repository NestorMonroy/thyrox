#!/usr/bin/env bash
# Pruebas de `check_mutante_en_staging.py` — el guard que impide que un mutante
# de sabotaje entre al historial (H-DOCS-466, tarea #916).
#
# El episodio: `check_suite_discrimina.py` inyecta `raise SystemExit(97)  #
# MUTANTE` para medir si la suite discrimina, y NO restaura si lo matan. Uno
# sobrevivio en `check_vocabulario_prosa.py:228` y explicaba los dos fallos de
# la linea base sin que nada lo delatara. La restauracion ante señal es la
# tarea #915; ESTE guard es la red: aunque el mutador muera, el mutante no
# llega al commit.
#
# Cada caso declara que lo haria fallar — sub-patron D de
# `metrica-decide-la-conclusion.md`. Un guard que no puede fallar no es red.
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUION="$AQUI/../gates/check_mutante_en_staging.py"
OK=0; KO=0

afirmar() {  # afirmar <descripcion> <esperado> <obtenido>
    if [ "$2" = "$3" ]; then
        OK=$((OK + 1)); printf '  ok    %s\n' "$1"
    else
        KO=$((KO + 1)); printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3" >&2
    fi
}
contiene() {  # contiene <descripcion> <patron> <texto>
    case "$3" in
        *"$2"*) OK=$((OK + 1)); printf '  ok    %s\n' "$1" ;;
        *) KO=$((KO + 1)); printf '  FALLO %s\n        no contiene=[%s]\n' "$1" "$2" >&2 ;;
    esac
}

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "== 1. el guion existe y parsea =="
python3 -c "import ast,sys; ast.parse(open(sys.argv[1]).read())" "$GUION" 2>/dev/null
afirmar "check_mutante_en_staging.py parsea" 0 $?

echo "== 2. archivo limpio -> exit 0 =="
printf 'def f():\n    return 1\n' > "$TMP/limpio.py"
SALIDA="$(python3 "$GUION" "$TMP/limpio.py" 2>&1)"; CODIGO=$?
afirmar "un .py sin mutante sale 0" 0 "$CODIGO"
contiene "publica su denominador" "1 archivo" "$SALIDA"

echo "== 3. CONTROL POSITIVO — el mutante REAL, con la forma que el mutador escribe =="
# La forma exacta de `check_suite_discrimina.py`: sangria + sentencia + dos
# espacios + marcador. No es un incumplidor fabricado a ojo: se deriva del
# mutador, que es la unica fuente de la forma.
printf 'def f():\n    raise SystemExit(97)  # MUTANTE\n    return 1\n' > "$TMP/sucio.py"
SALIDA="$(python3 "$GUION" "$TMP/sucio.py" 2>&1)"; CODIGO=$?
afirmar "un .py con mutante sale 1" 1 "$CODIGO"
contiene "nombra el archivo sucio" "sucio.py" "$SALIDA"
contiene "nombra la linea" ":2" "$SALIDA"

echo "== 4. CONTROL NEGATIVO — la constante del propio mutador NO es un mutante =="
# `check_suite_discrimina.py` DECLARA la marca en una constante a nivel de
# modulo. Si el guard la contara, se bloquearia a si mismo en cada commit y se
# aprenderia a saltarlo con --no-verify.
printf 'SABOTAGE = "raise SystemExit(97)"\nMARCA = "# MUTANTE"\n' > "$TMP/declara.py"
python3 "$GUION" "$TMP/declara.py" >/dev/null 2>&1
afirmar "la declaracion a nivel de modulo NO cuenta" 0 $?

echo "== 5. el mutador REAL del repo pasa su propio guard =="
python3 "$GUION" "$AQUI/../gates/check_suite_discrimina.py" >/dev/null 2>&1
afirmar "check_suite_discrimina.py no se bloquea a si mismo" 0 $?

echo "== 6. sin argumentos, el alcance sale del staging =="
SALIDA="$(cd "$TMP" && git init -q . && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m seed \
    && cp sucio.py s.py && git add s.py && python3 "$GUION" 2>&1)"; CODIGO=$?
afirmar "un mutante en staging bloquea" 1 "$CODIGO"

echo "== 7. el arbol vivo esta limpio (control del repo real) =="
python3 "$GUION" $(git ls-files '*.py' | head -400) >/dev/null 2>&1
afirmar "ningun .py versionado trae un mutante" 0 $?

printf '\n%s de %s aserciones en verde\n' "$OK" "$((OK + KO))"
[ "$KO" -eq 0 ]

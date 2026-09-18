#!/usr/bin/env bash
# ¿Que suite deja su fixture atras? — medido por CONDUCTA, no por literal.
#
# El censo que precedio a este guion buscaba `trap ... rm -rf` en el fuente y
# concluia «esta suite deja fixture». Medido: `test-record-environment.sh` no
# declara ningun `trap` y aun asi no deja nada — retira su directorio en linea
# (`:67`, `:80`, `:88`). El literal es el significante; dejar fixture es el
# significado. Concluir del primero sobre el segundo es el sub-patron C de
# `metrica-decide-la-conclusion.md`, y sobreestimaba: 22 supuestas infractoras.
#
# El instrumento correcto ejecuta la suite con `TMPDIR` desviado a un directorio
# sonda y cuenta lo que sobrevive ahi. Dos ejes, no uno:
#
#   confined   lo que quedo en la sonda — sin el desvio habria ido a /tmp;
#   shared     lo que aparecio en /tmp A PESAR del desvio — una plantilla de
#              ruta fija, que ningun `TMPDIR` alcanza.
#
# Un solo eje no los separa, y son defectos distintos: el primero lo cierra el
# desvio de `tests/run.sh`; el segundo NO, y hay que editar la suite.
#
# EL CONTROL QUE DISCRIMINA (caso 5): retirado el desvio de `TMPDIR`, la fuga
# confinada tiene que volverse invisible — cae exactamente el caso que la mide.
#
# EL CONTROL DE ATRIBUCION (caso 8): el eje compartido no puede saber QUIEN
# escribio. Una suite limpia con un vecino que escriba en el compartido dentro
# de la ventana se publica como FUGA — la ceguera que el sujeto declara en su
# cabecera, medida aqui en vez de supuesta.
#
# NO BORRA NADA: la sonda ES la evidencia de lo que se fugo.
set -uo pipefail
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/src/paths/reach.py" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
cd "$_thyrox_root" || exit 1

SCRIPT=src/repo/fixture_leak.sh
PASSED=0; FAILED=0
assert_equals() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; (( PASSED++ ))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FAILED++ )); fi
}
assert_contains() {
    if grep -qF -- "$2" <<<"$3"; then printf '  ok    %s\n' "$1"; (( PASSED++ ))
    else printf '  FALLO %s\n        no contiene [%s] en:\n%s\n' "$1" "$2" "$3"; (( FAILED++ )); fi
}

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
BASE="$WORK/sondas"

# El eje COMPARTIDO apunta a un directorio PROPIO, no al `/tmp` del default.
# El sujeto declara en su cabecera que es «ciega a lo que otro proceso cree en
# el compartido durante la ventana de medicion, que se le atribuye a la suite»:
# con el default, cualquier proceso AJENO a la prueba fabrica el positivo de
# los casos que afirman `exit 0`, y el veredicto pasa a medir el trafico del
# directorio compartido en vez del sujeto.
#
# MEDIDO EN LOS DOS SENTIDOS, bajo `run-task-pool --width 4` con otras tres
# suites de vecinas (evidencia en
# `.claude/workbench/universo-global-de-dos-suites-20260917T185131/outputs/`):
#
#   sin aislamiento   ok=13 fallo=1 — cae el caso 1, `exit 0 sin fuga` -> 1,
#                     con `confined=0`: la FUGA viene del eje compartido, no
#                     de la suite. (`width4-pre-fix-job-001.log`)
#   con aislamiento   ok=17 fallo=0. (`width4-post-fix-job-001.log`)
#
# Y por que en serie no se ve: `tests/run.sh:45` exporta `TMPDIR` a un
# directorio por ejecucion, asi que bajo ESE corredor ninguna suite vecina
# escribe en `/tmp` de primer nivel. `run-task-pool.sh` NO lo redirige — lo
# menciona en un comentario y nada mas. La diferencia entre los dos corredores
# es lo que hacia parecer intermitente un defecto que es determinista.
#
# Un primer control de anulacion, con un vecino propio escribiendo cada 400 ms,
# NO discrimino (`mutante.log`): la ventana de medicion de una suite limpia
# dura milisegundos, asi que ese vecino casi nunca cae dentro. El instrumento
# era demasiado lento, no la hipotesis falsa — la conserva el banco porque la
# refutacion aparente tambien es un resultado.
#
# Aislarlo NO esconde la ceguera: el caso 8 la mide de frente, con un vecino
# deterministico.
mkdir -p "$WORK/compartido-propio"
export THYROX_FIXTURE_LEAK_SHARED="$WORK/compartido-propio"

# --- Los tres sujetos, cada uno una suite real de una linea de conducta ---

# (a) limpia: crea su fixture y lo retira.
cat > "$WORK/suite-clean.sh" <<'EOS'
#!/usr/bin/env bash
d=$(mktemp -d); echo dato > "$d/archivo"; rm -rf "$d"; exit 0
EOS

# (b) fuga confinada: crea y NO retira. Con TMPDIR desviado cae en la sonda.
cat > "$WORK/suite-confined.sh" <<'EOS'
#!/usr/bin/env bash
d=$(mktemp -d); echo dato > "$d/archivo"; exit 0
EOS

# (c) fuga compartida: plantilla de ruta FIJA — ignora TMPDIR por construccion.
# La ruta fija apunta al arbol del propio test, no al compartido real: el eje que
# el caso mide es la INMUNIDAD a TMPDIR, no la ubicacion. Con la ruta real, este
# instrumento seria el grifo que denuncia — y dejo dos directorios en /tmp antes
# de esta correccion, que se conservan como evidencia.
mkdir -p "$WORK/compartido"
cat > "$WORK/suite-shared.sh" <<EOS
#!/usr/bin/env bash
d=\$(mktemp -d "$WORK/compartido/thyrox-leak-probe-XXXXXX")
echo dato > "\$d/archivo"; exit 0
EOS
chmod +x "$WORK"/suite-*.sh

echo "== 1. la suite que limpia sale sin fuga =="
OUT=$(bash "$SCRIPT" --base "$BASE" "$WORK/suite-clean.sh" 2>&1); CODE=$?
assert_equals "exit 0 sin fuga" 0 "$CODE"
assert_contains "declara 0 confinadas" "confined=0" "$OUT"

echo "== 2. la fuga CONFINADA se ve y se nombra =="
OUT=$(bash "$SCRIPT" --base "$BASE" "$WORK/suite-confined.sh" 2>&1); CODE=$?
assert_equals "exit 1 cuando hay fuga" 1 "$CODE"
assert_contains "nombra la suite" "suite-confined.sh" "$OUT"
assert_contains "cuenta la entrada confinada" "confined=1" "$OUT"

echo "== 3. la fuga COMPARTIDA se separa de la confinada =="
OUT=$(THYROX_FIXTURE_LEAK_SHARED="$WORK/compartido" \
    bash "$SCRIPT" --base "$BASE" "$WORK/suite-shared.sh" 2>&1); CODE=$?
assert_equals "exit 1 con fuga compartida" 1 "$CODE"
assert_contains "la cuenta en el eje compartido" "shared=1" "$OUT"
assert_contains "y no en el confinado" "confined=0" "$OUT"

echo "== 4. rehusa SIN cifra ante una suite inexistente =="
OUT=$(bash "$SCRIPT" --base "$BASE" "$WORK/no-existe.sh" 2>&1); CODE=$?
assert_equals "exit 2 al rehusar" 2 "$CODE"
assert_equals "no emite cifra" 0 "$(grep -c 'confined=' <<<"$OUT")"

echo "== 5. ANULACION: sin el desvio de TMPDIR la fuga confinada desaparece =="
MUTANT="$WORK/mutante.sh"
sed 's/^THYROX_TEST_REDIRECT_TMPDIR=1$/THYROX_TEST_REDIRECT_TMPDIR=0/' "$SCRIPT" > "$MUTANT"
assert_equals "la anulacion modifico el guion" 1 \
    "$(diff -q "$SCRIPT" "$MUTANT" >/dev/null; echo $?)"
# El mutante NO desvia, asi que el fixture cae en el TMPDIR del LLAMADOR. Se
# le da uno propio: la asercion mide que el guion no desvia, no donde escribe
# quien lo invoca. Sin esto el control de anulacion seria el grifo que el
# instrumento denuncia — medido: dejaba un `tmp.XXXXXXXXXX` en /tmp por cada
# ejecucion.
mkdir -p "$WORK/ambiente"
OUT=$(TMPDIR="$WORK/ambiente" bash "$MUTANT" --base "$BASE" "$WORK/suite-confined.sh" 2>&1)
assert_contains "sin desvio, la fuga confinada se publica como 0" "confined=0" "$OUT"

echo "== 6. la anulacion NO afecta a la suite limpia =="
TMPDIR="$WORK/ambiente" bash "$MUTANT" --base "$BASE" "$WORK/suite-clean.sh" >/dev/null 2>&1
assert_equals "el caso sano sigue en 0 con y sin el desvio" 0 "$?"

echo "== 7. NO BORRA: la sonda conserva lo que se fugo =="
bash "$SCRIPT" --base "$BASE" "$WORK/suite-confined.sh" >/dev/null 2>&1
assert_equals "queda al menos una entrada de evidencia" 1 \
    "$(find "$BASE" -mindepth 2 -maxdepth 2 | head -1 | wc -l)"

echo "== 8. ATRIBUCION: la entrada de OTRO proceso se imputa a la suite =="
# La ceguera declarada, MEDIDA en vez de supuesta — y sin `sleep`: el vecino
# escribe de forma sincrona dentro de la ventana, asi que el control es
# deterministico y no depende de la carga de la maquina.
#
# La suite es LIMPIA —crea su fixture y lo retira— y aun asi se publica como
# FUGA, porque el instrumento compara el antes y el despues del compartido y
# no puede saber quien escribio. Es la ceguera declarada, no una hipotesis.
mkdir -p "$WORK/compartido-vecino"
cat > "$WORK/suite-vecino.sh" <<EOS
#!/usr/bin/env bash
d=\$(mktemp -d); echo dato > "\$d/archivo"; rm -rf "\$d"
bash -c 'mktemp -d "$WORK/compartido-vecino/vecino-XXXXXX" >/dev/null'
exit 0
EOS
chmod +x "$WORK/suite-vecino.sh"
OUT=$(THYROX_FIXTURE_LEAK_SHARED="$WORK/compartido-vecino" \
    bash "$SCRIPT" --base "$BASE" "$WORK/suite-vecino.sh" 2>&1); CODE=$?
assert_equals "la suite LIMPIA sale FUGA por la entrada ajena" 1 "$CODE"
assert_contains "la imputacion cae en el eje compartido" "shared=1" "$OUT"
assert_contains "y el confinado queda en 0: no fue ella" "confined=0" "$OUT"

printf '\nok=%d fallo=%d\n' "$PASSED" "$FAILED"
[[ $FAILED -eq 0 ]]

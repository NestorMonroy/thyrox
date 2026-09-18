#!/usr/bin/env bash
# El fixture se retira solo — desmontaje automatico, no un `trap` por suite.
#
# Meszaros llama a esto *automated teardown* en xUnit Test Patterns, y su
# ausencia *resource leakage*. Medido por conducta con `src/repo/fixture_leak.sh`:
# seis suites dejaban 47 entradas entre todas. El arreglo NO es escribir seis
# `trap` —eso es la duplicacion que DRY prohibe, y cada copia envejece por su
# cuenta— sino un mecanismo con seis consumidores.
#
# EL CONTROL QUE DISCRIMINA (caso 4): un segundo `trap ... EXIT` REEMPLAZA al
# primero. Una suite que ya tiene su propio desmontaje —matar un centinela,
# restaurar un archivo— lo perderia al adoptar este mecanismo, y el defecto
# seria peor que la fuga: silencioso. La anulacion retira la composicion y ese
# caso tiene que caer, solo ese.
set -uo pipefail
ROOT="${THYROX_ROOT:-}"
if [[ -z "$ROOT" ]]; then
    ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$ROOT" != "/" && ! -f "$ROOT/src/paths/reach.py" ]]; do
        ROOT="$(dirname "$ROOT")"
    done
fi
cd "$ROOT" || exit 1

SUBJECT="src/lib/fixture.sh"
PASSED=0; FAILED=0
assert_equals() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; (( PASSED++ ))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FAILED++ )); fi
}

# La sonda corre en un proceso APARTE: el desmontaje se dispara al salir, asi
# que medirlo dentro de este mismo proceso mediria otra cosa.
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
export TMPDIR="$WORK/ambiente"; mkdir -p "$TMPDIR"

probe() {   # probe <cuerpo-del-guion> -> imprime lo que el cuerpo imprima
    local body="$1"; local script="$WORK/probe.sh"
    { printf '#!/usr/bin/env bash\nset -uo pipefail\ncd %q\nsource %q\n' "$ROOT" "$SUBJECT"
      printf '%s\n' "$body"; } > "$script"
    bash "$script" 2>&1
}

echo "== 1. fixture_dir crea un directorio bajo TMPDIR =="
OUT=$(probe 'd=$(fixture_dir); [[ -d "$d" ]] && echo "EXISTE $d"')
assert_equals "el directorio existe mientras la sonda vive" 1 "$(grep -c '^EXISTE ' <<<"$OUT")"
assert_equals "y cae bajo TMPDIR" 1 "$(grep -c "EXISTE $TMPDIR/" <<<"$OUT")"

echo "== 2. al salir la sonda, el directorio se ha retirado =="
RUTA=$(probe 'd=$(fixture_dir); echo "$d"' | tail -1)
assert_equals "la ruta se retiro al salir" 0 "$([[ -e "$RUTA" ]] && echo 1 || echo 0)"

echo "== 3. fixture_file hace lo propio con un archivo =="
RUTA_F=$(probe 'f=$(fixture_file); echo dato > "$f"; echo "$f"' | tail -1)
assert_equals "el archivo se retiro al salir" 0 "$([[ -e "$RUTA_F" ]] && echo 1 || echo 0)"

echo "== 4. COMPOSICION: el trap propio de la suite SOBREVIVE =="
# Es el caso critico: `trap ... EXIT` reemplaza, no acumula. Una suite que ya
# mata un centinela no puede perder ese desmontaje al adoptar el mecanismo.
TESTIGO="$WORK/testigo-del-trap"
OUT=$(probe "trap 'echo TRAP-PROPIO > $TESTIGO' EXIT
fixture_arm
d=\$(fixture_dir); echo \"\$d\"")
RUTA_C=$(tail -1 <<<"$OUT")
assert_equals "el trap propio de la suite corrio" 1 "$([[ -f "$TESTIGO" ]] && echo 1 || echo 0)"
assert_equals "y el fixture se retiro igual" 0 "$([[ -e "$RUTA_C" ]] && echo 1 || echo 0)"

echo "== 5. fixture_teardown es idempotente y se puede llamar a mano =="
OUT=$(probe 'd=$(fixture_dir); fixture_teardown; fixture_teardown; echo "CODIGO=$?"')
assert_equals "dos desmontajes seguidos no fallan" 1 "$(grep -c '^CODIGO=0$' <<<"$OUT")"

echo "== 6. ANULACION: sin composicion, el trap propio de la suite se pierde =="
MUTANT="$WORK/fixture-mutante.sh"
sed 's/^THYROX_TEST_COMPOSE_TRAP=1$/THYROX_TEST_COMPOSE_TRAP=0/' "$SUBJECT" > "$MUTANT"
assert_equals "la anulacion modifico el guion" 1 \
    "$(diff -q "$SUBJECT" "$MUTANT" >/dev/null; echo $?)"
TESTIGO2="$WORK/testigo-mutante"
cat > "$WORK/probe-mutante.sh" <<EOS
#!/usr/bin/env bash
set -uo pipefail
cd $(printf %q "$ROOT")
source $(printf %q "$MUTANT")
trap 'echo TRAP-PROPIO > $TESTIGO2' EXIT
fixture_arm
d=\$(fixture_dir)
EOS
bash "$WORK/probe-mutante.sh" >/dev/null 2>&1
assert_equals "sin composicion el trap propio NO corre" 0 \
    "$([[ -f "$TESTIGO2" ]] && echo 1 || echo 0)"

echo "== 7. la suite no deja nada en el directorio compartido =="
assert_equals "TMPDIR de la sonda vacio al terminar" 0 \
    "$(find "$TMPDIR" -mindepth 1 -maxdepth 1 2>/dev/null | wc -l)"

echo "== 8. fixture_adopt registra lo que la suite creo por otra via =="
# `mktemp -u` devuelve un nombre sin crearlo, y el hijo de un padre sin capturar
# no tiene variable que retirar. Las dos formas estan en las suites reales.
RUTA_A=$(probe 'p=$(mktemp -u "${TMPDIR}/adoptado-XXXXXX"); fixture_adopt "$p"
mkdir -p "$p/hijo"; echo "$p"' | tail -1)
assert_equals "la ruta adoptada se retiro al salir" 0 \
    "$([[ -e "$RUTA_A" ]] && echo 1 || echo 0)"

printf '\nok=%d fallo=%d\n' "$PASSED" "$FAILED"
[[ $FAILED -eq 0 ]]

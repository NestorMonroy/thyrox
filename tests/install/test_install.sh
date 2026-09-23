#!/usr/bin/env bash
# Control de `install.sh` — el canal por el que un repo consumidor declara
# dónde vive thyrox.
#
# Qué haría fallar a este control (sub-patrón D de
# `metrica-decide-la-conclusion.md`): que la negativa NO nombre la pieza que
# falta, o que una segunda ejecución escriba algo distinto de la primera. Los
# dos son defectos reales que un `test -f` sobre el `.env` no distinguiría.
#
# El árbol y el consumidor son sintéticos: el control no toca ningún clon real.

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
THYROX_REAL="$(cd "$HERE/../.." && pwd)"
INSTALL="$THYROX_REAL/install.sh"

PASS=0
FAIL=0

check() {
    local label="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        PASS=$((PASS + 1))
        printf '  ok   %s\n' "$label"
    else
        FAIL=$((FAIL + 1))
        printf '  FAIL %s\n       esperado: %s\n       obtenido: %s\n' \
            "$label" "$expected" "$actual"
    fi
}

check_contains() {
    local label="$1" needle="$2" haystack="$3"
    if printf '%s' "$haystack" | grep -qF -- "$needle"; then
        PASS=$((PASS + 1))
        printf '  ok   %s\n' "$label"
    else
        FAIL=$((FAIL + 1))
        printf '  FAIL %s\n       no menciona: %s\n       salida: %s\n' \
            "$label" "$needle" "$haystack"
    fi
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Un árbol de thyrox sintético: sólo la pieza que install.sh exige.
fake_tree() {
    local root="$WORK/tree-$1"
    mkdir -p "$root/src/paths" "$root/src/session"
    cp "$THYROX_REAL/src/paths/reach.py" "$root/src/paths/reach.py"
    cp "$THYROX_REAL/src/session/generate_bin.py" "$root/src/session/generate_bin.py"
    printf '%s' "$root"
}

# Un consumidor sintético: un repo git, que es lo que install.sh verifica.
fake_consumer() {
    local repo="$WORK/consumer-$1"
    mkdir -p "$repo"
    git -C "$repo" init -q
    printf '%s' "$repo"
}

printf '\n== install.sh — precondiciones que se rehúsan ==\n'

# 1. Sin python3: la negativa nombra el intérprete, no un error genérico.
TREE="$(fake_tree sin-python)"; CONSUMER="$(fake_consumer sin-python)"
OUT="$(PATH=/nonexistent THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"
RC=$?
check        "sin python3 -> exit 1"            "1" "$RC"
check_contains "sin python3 -> nombra python3"  "python3" "$OUT"

# 2. Raíz sin `src/paths/reach.py`: nombra el archivo ausente, no «no existe».
EMPTY="$WORK/tree-vacio"; mkdir -p "$EMPTY"; CONSUMER="$(fake_consumer arbol-vacio)"
OUT="$(THYROX_ROOT="$EMPTY" /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"; RC=$?
check        "arbol incompleto -> exit 1"                 "1" "$RC"
check_contains "arbol incompleto -> nombra reach.py"      "src/paths/reach.py" "$OUT"

# 3. Destino que no es repo git: la verificación es «es un repo», no «existe
#    la ruta» — un `test -d` no podría fallar aquí y no discriminaría.
TREE="$(fake_tree sin-git)"; NOREPO="$WORK/no-es-repo"; mkdir -p "$NOREPO"
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$NOREPO" 2>&1)"; RC=$?
check        "destino sin git -> exit 1"          "1" "$RC"
check_contains "destino sin git -> nombra el destino" "$NOREPO" "$OUT"

# 4. Destino inexistente: se distingue de «existe pero no es repo».
TREE="$(fake_tree inexistente)"
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$WORK/no-existe-en-absoluto" 2>&1)"; RC=$?
check "destino inexistente -> exit 1" "1" "$RC"

printf '\n== install.sh — el camino que sí instala ==\n'

TREE="$(fake_tree feliz)"; CONSUMER="$(fake_consumer feliz)"
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"; RC=$?
check "instala -> exit 0" "0" "$RC"
check "instala -> escribe .env" "si" \
      "$([ -f "$CONSUMER/.env" ] && echo si || echo no)"
check "instala -> declara THYROX_ROOT con la raiz resuelta" "THYROX_ROOT=$TREE" \
      "$(grep '^THYROX_ROOT=' "$CONSUMER/.env" 2>/dev/null || echo AUSENTE)"
check "instala -> genera bin/ desde los entrypoints" "si" \
      "$([ -x "$TREE/bin/generate_bin" ] && echo si || echo no)"

# El generador descubre los guiones por estructura; no debe ejecutarlos para
# decidir que existen. El control usa una escritura observable, no confía en
# el comentario del candidato.
WRITER="$TREE/src/session/write-if-executed.sh"
SENTINEL="$WORK/candidate-was-executed"
printf '#!/usr/bin/env bash\nprintf ejecutado > %q\n' "$SENTINEL" > "$WRITER"
chmod +x "$WRITER"
THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" >/dev/null 2>&1
check "instalar genera el wrapper del candidato" "si" \
      "$([ -x "$TREE/bin/write-if-executed" ] && echo si || echo no)"
check "instalar NO ejecuta el candidato" "no" \
      "$([ -e "$SENTINEL" ] && echo si || echo no)"

# 5. Idempotencia: la segunda ejecución no cambia un byte. Es la propiedad que
#    un `test -f` no puede ver — el archivo existe en los dos casos.
ANTES="$(sha256sum "$CONSUMER/.env" | cut -d' ' -f1)"
THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" >/dev/null 2>&1
DESPUES="$(sha256sum "$CONSUMER/.env" | cut -d' ' -f1)"
check "re-ejecutar -> el .env no cambia" "$ANTES" "$DESPUES"

# 6. No pisa lo que el consumidor ya tenía.
CONSUMER="$(fake_consumer con-env)"
printf 'DB_HOST=/var/run/postgresql\nOTRA=1\n' > "$CONSUMER/.env"
THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" >/dev/null 2>&1
check "preserva las claves previas" "2" \
      "$(grep -cE '^(DB_HOST|OTRA)=' "$CONSUMER/.env")"
check "anade la suya" "1" "$(grep -c '^THYROX_ROOT=' "$CONSUMER/.env")"

# 7. Corrige un valor obsoleto en vez de duplicar la clave.
CONSUMER="$(fake_consumer valor-viejo)"
printf 'THYROX_ROOT=/ruta/que/ya/no/existe\n' > "$CONSUMER/.env"
THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" >/dev/null 2>&1
check "corrige el valor obsoleto" "THYROX_ROOT=$TREE" \
      "$(grep '^THYROX_ROOT=' "$CONSUMER/.env")"
check "no duplica la clave" "1" "$(grep -c '^THYROX_ROOT=' "$CONSUMER/.env")"

printf '\n== install.sh — la segunda entrada: la RUTA del archivo ==\n'

# La forma que la referencia fija: una entrada lleva el valor, la otra lleva el
# archivo que lo declara. Si install.sh ignorara la segunda, escribiria en un
# archivo que el lector no mira — y las dos mitades quedarian verdes por
# separado sin que nada funcionara.
TREE="$(fake_tree segunda-entrada)"; CONSUMER="$(fake_consumer segunda-entrada)"
DECLARADO="$WORK/entorno-declarado.env"; : > "$DECLARADO"
THYROX_ENV_FILE="$DECLARADO" THYROX_ROOT="$TREE" \
    /bin/bash "$INSTALL" "$CONSUMER" >/dev/null 2>&1
check "THYROX_ENV_FILE gana como destino" "THYROX_ROOT=$TREE" \
      "$(grep '^THYROX_ROOT=' "$DECLARADO" 2>/dev/null || echo AUSENTE)"
check "y no escribe el .env del destino" "no" \
      "$([ -f "$CONSUMER/.env" ] && echo si || echo no)"

# La CARGA: sin THYROX_ROOT en el proceso, la raiz se lee del archivo. Sin esta
# asercion, un lector que devolviera siempre vacio caeria al directorio del
# guion y pasaria igual — el verde no discriminaria.
OTRO="$(fake_tree cargada-del-archivo)"
CARGA="$WORK/carga.env"; printf 'THYROX_ROOT=%s\n' "$OTRO" > "$CARGA"
CONSUMER="$(fake_consumer carga)"
# `env -u`: el corredor (`tests/run.sh`) y los envoltorios de `bin/` EXPORTAN
# `THYROX_ROOT`, asi que sin retirarla el caso heredaba la raiz real y no
# medía la carga. Era el rojo de la medicion de partida de feature/thyrox-l5.
OUT="$(env -u THYROX_ROOT THYROX_ENV_FILE="$CARGA" /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"
check_contains "carga la raiz del archivo de entorno" "$OTRO" "$OUT"
check "y declara ESA raiz, no la del guion" "THYROX_ROOT=$OTRO" \
      "$(grep '^THYROX_ROOT=' "$CARGA" | tail -1)"

printf '\n== install.sh — los dos modos que no escriben ==\n'

CONSUMER="$(fake_consumer dry-run)"
THYROX_ROOT="$TREE" /bin/bash "$INSTALL" --dry-run "$CONSUMER" >/dev/null 2>&1
check "--dry-run no escribe" "no" \
      "$([ -f "$CONSUMER/.env" ] && echo si || echo no)"

CONSUMER="$(fake_consumer check-sin-instalar)"
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" --check "$CONSUMER" 2>&1)"; RC=$?
check "--check sin instalar -> exit 1" "1" "$RC"
check "--check no escribe" "no" \
      "$([ -f "$CONSUMER/.env" ] && echo si || echo no)"

THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" >/dev/null 2>&1
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" --check "$CONSUMER" 2>&1)"; RC=$?
check "--check ya instalado -> exit 0" "0" "$RC"

# La declaración del consumidor y los wrappers son dos productos del mismo
# instalador. Un bin/ ausente no puede publicar verde sólo porque `.env` esté
# bien: ése sería comprobar el significante equivocado.
rm -rf "$TREE/bin"
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" --check "$CONSUMER" 2>&1)"; RC=$?
check "--check con bin/ ausente -> exit 1" "1" "$RC"
check_contains "--check con bin/ ausente nombra el generador" \
    "src/session/generate_bin.py" "$OUT"
check "--check con bin/ ausente no escribe" "no" \
      "$([ -d "$TREE/bin" ] && echo si || echo no)"
# Restablece el fixture compartido para que los casos siguientes midan la
# declaración del consumidor, no vuelvan a medir deliberadamente la deriva.
THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" >/dev/null 2>&1

printf '\n== install.sh — --check dice QUE clave mide (tarea #246) ==\n'

# El aviso decia «sin declarar» a secas, y el resumen «5 de 5 sin declarar».
# Las dos formas se leen como si faltaran las 27 claves que `.env.example`
# declara, cuando install.sh escribe UNA: THYROX_ROOT. Un consumidor que ya
# declaraba `THYROX_WORKBENCH_API` aparecia igual de vacio que uno sin nada.
CONSUMER="$(fake_consumer check-nombra-clave)"
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" --check "$CONSUMER" 2>&1)"
check_contains "el aviso nombra la clave que mide" "THYROX_ROOT" "$OUT"
check_contains "el resumen tambien la nombra" "sin THYROX_ROOT" "$OUT"

# Y distingue «no encuentra thyrox» de «no declaro nada»: el consumidor que ya
# declara otra clave del contrato lo ve reflejado. Sin esta mitad, el aviso
# sigue colapsando dos estados distintos en la misma linea.
CONSUMER="$(fake_consumer check-con-otra-clave)"
printf 'THYROX_WORKBENCH_DIR=/un/hogar\n' > "$CONSUMER/.env"
printf 'THYROX_ROOT=\nTHYROX_WORKBENCH_DIR=\nTHYROX_EVIDENCE_DIR=\n' > "$TREE/.env.example"
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" --check "$CONSUMER" 2>&1)"
check_contains "reporta las claves del contrato que el consumidor ya declara" \
    "1 de 3" "$OUT"

# La FAMILIA POR CLON no aparece como literal en el contrato: se compone en
# tiempo de ejecucion (`THYROX_WORKBENCH_` + el clon). Un contador de igualdad
# literal la cuenta como cero, y ese fue el primer resultado real: «0 de 27»
# sobre un arbol que si declaraba una. Medir el significante y concluir sobre
# el significado.
CONSUMER="$(fake_consumer check-familia-por-clon)"
printf 'THYROX_WORKBENCH_API=/un/banco\n' > "$CONSUMER/.env"
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" --check "$CONSUMER" 2>&1)"
check_contains "la familia por clon se ve, no se cuenta como cero" \
    "+1 fuera de él" "$OUT"

# Control de anulacion: sin `.env.example` en el arbol, el contrato NO se puede
# leer. Publicar «0 de 0» ahi seria el verde falso — no distinguiria «no
# declara nada» de «no pude medir el contrato».
TREE_SIN="$(fake_tree sin-contrato)"
CONSUMER="$(fake_consumer check-sin-contrato)"
THYROX_ROOT="$TREE_SIN" PYTHONPATH="$TREE_SIN/src" \
    python3 "$TREE_SIN/src/session/generate_bin.py" >/dev/null
OUT="$(THYROX_ROOT="$TREE_SIN" /bin/bash "$INSTALL" --check "$CONSUMER" 2>&1)"
check_contains "sin .env.example dice que no pudo leer el contrato" \
    "contrato no legible" "$OUT"

printf '\n== install.sh — el parametro del consumidor no viaja al mecanismo ==\n'

# El nombre de un repo consumidor NO se codifica en install.sh (DEC-04 y la
# fuga de la clase #142). Se mide sobre el guion, no sobre su salida.
check "install.sh no nombra al consumidor" "0" \
      "$(grep -ci 'kaupamex' "$INSTALL" || true)"

printf '\n== install.sh — la raiz NO es "donde vive el guion" ==\n'
# `SCRIPT_DIR` es aritmetica de ruta con offset cero: da la respuesta correcta
# solo mientras el guion viva EN la raiz. Es la misma clase que `parents[N]`
# (H-DOCS-1103), y falla igual de silenciosa el dia que alguien mueva el guion
# o lo invoque por un enlace.
#
# Que haria fallar a este control: que el ascenso encuentre "algo" siempre. Por
# eso el segundo caso parte de FUERA de todo arbol y exige que REHUSE — un
# localizador que nunca falla no esta localizando, esta adivinando.

TREE_HONDO="$(fake_tree hondo)"
CONSUMER_HONDO="$(fake_consumer hondo)"
mkdir -p "$TREE_HONDO/bin"
cp "$INSTALL" "$TREE_HONDO/bin/install.sh"

SALIDA_HONDO="$(env -u THYROX_ROOT bash "$TREE_HONDO/bin/install.sh" \
    "$CONSUMER_HONDO" 2>&1)"
check "desde un nivel mas hondo, resuelve la raiz igual" 0 "$?"
check_contains "y el .env del consumidor apunta al arbol" \
    "THYROX_ROOT=$TREE_HONDO" "$(cat "$CONSUMER_HONDO/.env" 2>/dev/null)"

# Control: fuera de todo arbol NO hay raiz que hallar, y se dice.
SUELTO="$WORK/suelto"
mkdir -p "$SUELTO"
cp "$INSTALL" "$SUELTO/install.sh"
CONSUMER_SUELTO="$(fake_consumer suelto)"
SALIDA_SUELTA="$(env -u THYROX_ROOT bash "$SUELTO/install.sh" \
    "$CONSUMER_SUELTO" 2>&1)"
check "control — fuera de todo arbol rehusa" 1 "$?"
check_contains "y nombra la pieza que falta" "src/paths/reach.py" "$SALIDA_SUELTA"

# --------------------------------------------------------------------------
# El informe final NOMBRA el preflight de la cadena de herramientas.
#
# El defecto que cierra: `install.sh` es el unico punto de entrada en bash puro
# —`clone_bootstrap` es un `.py` y muere en el guard del interprete antes de
# que `.venv` exista—, asi que es el unico sitio donde quien acaba de clonar
# lee algo. Sin esta linea, `bin/` trae 198 envoltorios y el que clona no
# tiene como saber cuales puede usar hoy: descubre el hueco al primer
# `command not found`, que es exactamente lo que el aviso degradado existe
# para evitar.
#
# Se mide sobre la ejecucion REAL, no sobre el fuente: un `grep` del guion
# pasaria con la linea escrita dentro de una rama que nunca se toma.
# --------------------------------------------------------------------------
TREE_PRE="$(fake_tree preflight)"
cp "$INSTALL" "$TREE_PRE/install.sh"
CONSUMER_PRE="$(fake_consumer preflight)"
SALIDA_PRE="$(env -u THYROX_ROOT bash "$TREE_PRE/install.sh" "$CONSUMER_PRE" 2>&1)"
check_contains "el informe final nombra el preflight de la cadena" \
    "bin/check-toolchain-ready" "$SALIDA_PRE"

# --------------------------------------------------------------------------
# install.sh lo invoca TODO — H-THYROX-161
#
# Un clon nuevo trae `.githooks/` y el driver `sqlite-union` declarados, y los
# dos viven en `.git/config`, que no viaja: git no corre los hooks y el store
# se mergea como binario. Los mecanismos existian —`src/verify/install-hooks.sh`,
# `check-toolchain-ready.sh`, `check_env_contract_keys.py`— y nadie los
# invocaba. install.sh es el paso del onboarding, asi que los invoca el.
#
# Los mecanismos del arbol sintetico son ESPIAS: registran con que destino y
# que argumentos los llamaron, o devuelven el veredicto que el caso pide. Lo
# que se prueba es el contrato de install.sh —delegar, propagar, no escribir
# en --check—, no lo que cada mecanismo hace, que tiene su propia suite.
# --------------------------------------------------------------------------
printf '\n== install.sh — prepara los clones y mide el arbol ==\n'

spy_tree() {
    local root; root="$(fake_tree "$1")"
    mkdir -p "$root/src/verify"
    git -C "$root" init -q
    cat > "$root/src/verify/install-hooks.sh" <<'SPY'
#!/usr/bin/env bash
printf 'TARGET=%s ARGS=%s\n' "$THYROX_TARGET_REPO" "$*" >> "$SPY_LOG"
# exit 3 es el codigo del instalador real para «githooks y driver hechos, los
# hooks de sesion no». El caso elige a que destino se lo devuelve.
[ "$THYROX_TARGET_REPO" = "${SPY_RC3_FOR:-}" ] && exit 3
exit 0
SPY
    cat > "$root/src/verify/check-toolchain-ready.sh" <<'SPY'
#!/usr/bin/env bash
printf '%s\n' "${SPY_PREFLIGHT_OUT:-8 ok · 0 error · 0 aviso}"
exit "${SPY_PREFLIGHT_RC:-0}"
SPY
    cat > "$root/src/verify/check_env_contract_keys.py" <<'SPY'
import os, sys
print(os.environ.get("SPY_CONTRACT_OUT", "sin declarar: 0"))
sys.exit(int(os.environ.get("SPY_CONTRACT_RC", "0")))
SPY
    printf '%s' "$root"
}

# 8. Delega en el instalador de clones, para el PROVEEDOR y para cada
#    consumidor, sin escribir los hooks de sesion (--solo-mostrar).
TREE="$(spy_tree todo)"; CONSUMER="$(fake_consumer todo)"; LOG="$WORK/spy-todo.log"
OUT="$(SPY_LOG="$LOG" THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"; RC=$?
check "prepara -> exit 0 con todo sano" "0" "$RC"
check "prepara el proveedor" "1" "$(grep -c "^TARGET=$TREE ARGS=--solo-mostrar$" "$LOG" 2>/dev/null || echo 0)"
check "prepara el consumidor" "1" "$(grep -c "^TARGET=$CONSUMER ARGS=--solo-mostrar$" "$LOG" 2>/dev/null || echo 0)"
check_contains "publica el preflight" "8 ok · 0 error" "$OUT"
check_contains "publica el contrato de .env" "sin declarar: 0" "$OUT"

# 9. Un preflight con error hace fallar la instalacion y se nombra.
TREE="$(spy_tree preflight-rojo)"; CONSUMER="$(fake_consumer preflight-rojo)"
OUT="$(SPY_LOG="$WORK/spy-pf.log" SPY_PREFLIGHT_RC=1 SPY_PREFLIGHT_OUT='error · githooks' \
       THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"; RC=$?
check "preflight con error -> exit 1" "1" "$RC"
check_contains "preflight con error -> nombra la sonda" "error · githooks" "$OUT"

# 10. Un contrato de .env roto hace fallar la instalacion y se nombra.
TREE="$(spy_tree contrato-rojo)"; CONSUMER="$(fake_consumer contrato-rojo)"
OUT="$(SPY_LOG="$WORK/spy-ct.log" SPY_CONTRACT_RC=1 SPY_CONTRACT_OUT='SIN DECLARAR  THYROX_X' \
       THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"; RC=$?
check "contrato roto -> exit 1" "1" "$RC"
check_contains "contrato roto -> nombra la clave" "SIN DECLARAR  THYROX_X" "$OUT"

# 11. --check no ESCRIBE: no invoca el instalador de clones, y un consumidor
#     con .githooks/ sin activar cuenta como pendiente.
TREE="$(spy_tree check)"; CONSUMER="$(fake_consumer check)"; LOG="$WORK/spy-check.log"
mkdir -p "$CONSUMER/.githooks"
SPY_LOG="$LOG" THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" >/dev/null 2>&1
git -C "$CONSUMER" config --unset core.hooksPath 2>/dev/null
: > "$LOG"
OUT="$(SPY_LOG="$LOG" THYROX_ROOT="$TREE" /bin/bash "$INSTALL" --check "$CONSUMER" 2>&1)"; RC=$?
check "--check con githooks sin activar -> exit 1" "1" "$RC"
check_contains "--check nombra core.hooksPath" "core.hooksPath" "$OUT"
check "--check no invoca el instalador de clones" "0" "$(grep -c . "$LOG")"

# 12. --dry-run tampoco lo invoca, y dice lo que haria.
TREE="$(spy_tree dry)"; CONSUMER="$(fake_consumer dry)"; LOG="$WORK/spy-dry.log"
OUT="$(SPY_LOG="$LOG" THYROX_ROOT="$TREE" /bin/bash "$INSTALL" --dry-run "$CONSUMER" 2>&1)"
check "--dry-run no invoca el instalador de clones" "0" "$(grep -c . "$LOG" 2>/dev/null || echo 0)"
check_contains "--dry-run dice que prepararia el clon" "prepararía" "$OUT"

# 13. Sin los mecanismos, NO se calla: se declara SIN MEDIR y se nombra el
#     archivo que falta. Un exit 0 mudo aqui es el verde falso de siempre.
TREE="$(fake_tree sin-mecanismos)"; CONSUMER="$(fake_consumer sin-mecanismos)"
OUT="$(THYROX_ROOT="$TREE" /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"
check_contains "sin instalador -> SIN MEDIR" "SIN MEDIR" "$OUT"
check_contains "sin instalador -> nombra el archivo" "src/verify/install-hooks.sh" "$OUT"

# 14. El PROVEEDOR no declara hooks de sesion: el instalador real sale 3
#     (githooks y driver hechos, sesion no) y eso es lo esperado para el.
#     En un CONSUMIDOR el mismo 3 es un fallo. Lo que discrimina es el
#     destino, no el codigo.
TREE="$(spy_tree rc3-proveedor)"; CONSUMER="$(fake_consumer rc3-proveedor)"
OUT="$(SPY_LOG="$WORK/spy-rc3a.log" SPY_RC3_FOR="$TREE" THYROX_ROOT="$TREE" \
       /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"; RC=$?
check "exit 3 en el proveedor -> exit 0" "0" "$RC"
check_contains "exit 3 en el proveedor -> lo dice" "sin hooks de sesión" "$OUT"
TREE="$(spy_tree rc3-consumidor)"; CONSUMER="$(fake_consumer rc3-consumidor)"
OUT="$(SPY_LOG="$WORK/spy-rc3b.log" SPY_RC3_FOR="$CONSUMER" THYROX_ROOT="$TREE" \
       /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"; RC=$?
check "exit 3 en un consumidor -> exit 1" "1" "$RC"

printf '\n%d aserciones: %d ok, %d fallidas\n' "$((PASS + FAIL))" "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]

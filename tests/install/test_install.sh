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
    mkdir -p "$root/src/paths"
    cp "$THYROX_REAL/src/paths/reach.py" "$root/src/paths/reach.py"
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
OUT="$(THYROX_ENV_FILE="$CARGA" /bin/bash "$INSTALL" "$CONSUMER" 2>&1)"
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

printf '\n== install.sh — el parametro del consumidor no viaja al mecanismo ==\n'

# El nombre de un repo consumidor NO se codifica en install.sh (DEC-04 y la
# fuga de la clase #142). Se mide sobre el guion, no sobre su salida.
check "install.sh no nombra al consumidor" "0" \
      "$(grep -ci 'kaupamex' "$INSTALL" || true)"

printf '\n%d aserciones: %d ok, %d fallidas\n' "$((PASS + FAIL))" "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]

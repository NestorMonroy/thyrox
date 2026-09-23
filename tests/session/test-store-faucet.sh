#!/usr/bin/env bash
# test-store-faucet.sh — una suite de bun no escribe en el store VERSIONADO.
#
# El defecto (H-THYROX-164): `loop/index.ts:211,677` resuelve el destino como
# `persistCleared ?? STORE_PATH`, y los casos que no pasan `persistCleared`
# escribian en `agent-results/agent_store.sqlite3`, que esta versionado. Medido:
# correr solo `contextPressure.test.ts` cambiaba el sha1 del store y sumaba
# filas de fixture a `cleared_tool_results`. Quien commiteaba despues de la
# suite metia basura de prueba en el registro que los hallazgos citan.
#
# El control positivo es esa suite, no un incumplidor fabricado. Y el segundo
# caso vigila la otra mitad: las suites que LEEN el esquema del store real
# (`observability.test.ts`) tienen que seguir viendolo.
#
# El store real se respalda antes y se restaura despues: sin eso, la mitad
# roja de este mismo test dejaria el dano que mide.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

STORE="$ROOT/agent-results/agent_store.sqlite3"
[[ -f "$STORE" ]] || { echo "test-store-faucet: no existe $STORE — NO se emite conteo" >&2; exit 2; }
command -v bun >/dev/null || { echo "test-store-faucet: falta bun — NO se emite conteo" >&2; exit 2; }

BACKUP="$(mktemp)"
cp "$STORE" "$BACKUP"
trap 'cp "$BACKUP" "$STORE"; rm -f "$BACKUP"' EXIT

# Sin THYROX_STORE heredado: el caso mide el default, que es el que ensuciaba.
before="$(sha1sum "$STORE" | cut -d' ' -f1)"
(cd "$ROOT" && env -u THYROX_STORE bun test src/packages/agent/__tests__/contextPressure.test.ts >/dev/null 2>&1)
after="$(sha1sum "$STORE" | cut -d' ' -f1)"
if [[ "$before" == "$after" ]]; then
  ok "contextPressure.test.ts no cambia el store versionado"
else
  bad "contextPressure.test.ts cambio el store versionado ($before -> $after)"
fi

# La otra mitad: quien lee el esquema real lo sigue viendo.
if (cd "$ROOT" && env -u THYROX_STORE bun test src/packages/observability/__tests__/observability.test.ts >/dev/null 2>&1); then
  ok "observability.test.ts sigue leyendo el esquema del store"
else
  bad "observability.test.ts falla: el preload le quito el esquema del store"
fi

thyrox_summary

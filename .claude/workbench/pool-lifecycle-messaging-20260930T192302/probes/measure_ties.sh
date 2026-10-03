#!/usr/bin/env bash
# Mide qué une hoy al ciclo de vida del pool con las tres piezas de mensajería.
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}"
echo "== menciones de mensajería en el pool (0 = sin conexión)"
for f in src/session/pool_lifecycle.py src/session/headless-pool.sh src/session/pool_integrate.sh; do
  printf '%s\t%s\n' "$f" "$(rg -c 'inbox|mailbox|uds|SendMessage|peer' "$f" </dev/null || echo 0)"
done
echo "== consumidores TypeScript de pool_lifecycle"
rg -l 'pool_lifecycle' src/packages --glob '*.ts' </dev/null | wc -l
echo "== herramientas del registro de thyrox -p que nombran mensajería"
rg -c 'SendMessage|ListAgents' src/packages/tools/src/registry.ts </dev/null || echo 0
echo "== UDS_INBOX en bin/cli (0 = apagada por defecto)"
rg -c 'UDS_INBOX' bin/cli </dev/null || echo 0
echo "== variables que el pool exporta a cada ítem"
rg -o 'THYROX_POOL_[A-Z_]+=' src/session/headless-pool.sh </dev/null | sort -u

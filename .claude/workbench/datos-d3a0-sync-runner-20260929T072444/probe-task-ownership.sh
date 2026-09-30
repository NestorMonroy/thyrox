#!/usr/bin/env bash
# Sonda de #289: qué ocurre con agent_store.sqlite3 cuando Bun abre primero y
# cuando Python abre primero. No toca el store real: trabaja en un directorio
# nuevo bajo este banco, uno por caso.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/datos-d3a0-sync-runner-20260929T072444
W="$B/ownership-probe"
mkdir -p "$W"

bun_tasks() {  # lo que hace tools/src/tasks.ts:conBase antes de operar
  bun -e "
    import { openLocal } from './src/packages/store/db.ts'
    import { TABLERO_DDL, TASK_HIGHWATER_DDL } from './src/packages/task/schema.ts'
    const db = openLocal('$1/agent_store.sqlite3'); db.run(TABLERO_DDL); db.run(TASK_HIGHWATER_DDL); db.close()"
}
bun_observability() {  # recordHarnessSession: inserta sin crear la tabla
  bun -e "
    import { recordHarnessSession } from './src/packages/observability/src/store.ts'
    try { recordHarnessSession('$1/agent_store.sqlite3', { agentId: 'probe', subagentType: 't', sessionId: 's', status: 'running', startedAt: new Date().toISOString() } as never); console.log('observability: ok') }
    catch (e) { console.log('observability: ERROR ' + (e as Error).message) }"
}
python_connect() {
  PYTHONPATH=src python3 -c "
from pathlib import Path
from agents import agent_store
c = agent_store.connect(Path('$1')); c.close(); print('python: ok')" 2>&1 | tail -1
}
schema() {
  python3 -c "
import sqlite3
c = sqlite3.connect('$1/agent_store.sqlite3')
for (n,) in c.execute(\"select name from sqlite_master where type='table' and name not like '%fts%' order by name\"):
    cols = [r[1] for r in c.execute(f'pragma table_info({n})')]
    print(f'  {n}: {len(cols)} cols')
"
}

for order in bun-first python-first observability-first; do
  D="$W/$order"; mkdir -p "$D"
  echo "== $order"
  case $order in
    bun-first)            bun_tasks "$D"; echo "-- tras bun"; schema "$D"; python_connect "$D" ;;
    python-first)         python_connect "$D"; echo "-- tras python"; schema "$D"; bun_tasks "$D" ;;
    observability-first)  bun_observability "$D" ;;
  esac
  echo "-- final"; schema "$D"
done

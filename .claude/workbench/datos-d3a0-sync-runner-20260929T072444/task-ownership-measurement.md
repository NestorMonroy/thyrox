# #289 ownership of agent_store.sqlite3 — measured, not decided

Probe: `probe-task-ownership.sh` (output in `probe-task-ownership.out`), on throwaway
databases under `ownership-probe/`. The real store is not touched.

| Question | Measured answer | Source |
|---|---|---|
| Who creates `agent_store.sqlite3`? | Either side. Python `connect()` does `mkdir` + `sqlite3.connect`; Bun `openLocal` → `new Database(path)` creates the file too. | `src/agents/agent_store.py:1205-1235`, `src/packages/store/db.ts:58` |
| Who creates `tasks`? | Both, with different DDL. Bun (`TABLERO_DDL`) creates 13 columns; Python creates 18. | probe: bun-first "tasks: 13 cols" |
| Who creates `task_highwater`? | Only Bun (`TASK_HIGHWATER_DDL` in `tools/src/tasks.ts:conBase`). Python never declares it. | probe: python-first has no `task_highwater` until Bun runs |
| Who evolves the schema? | Only Python: on every `connect()` it runs `CORE_SCHEMA` and 9 detection-based migrations (`ALTER TABLE ADD COLUMN` per missing column, table rebuilds for the composite PK and the status CHECK). No version table on either side. | `agent_store.py:1224-1234`, `:971`, `:1089`, `:1194` |
| Bun first, then Python | Converges: Python adds the 5 missing `tasks` columns (13 → 18) and creates the rest. | probe bun-first final |
| Python first, then Bun | Converges: Bun adds `task_highwater`; its `CREATE TABLE IF NOT EXISTS tasks` is a no-op. | probe python-first final |
| Other Bun writers of the same file | `observability/src/store.ts` inserts into `agent_sessions` and creates a trigger, but never creates `agent_sessions` (only Python and `src/store/agent_sessions.py` do). `observability/src/clearedResults.ts` creates `cleared_tool_results` in the same file. | `git grep "CREATE TABLE IF NOT EXISTS agent_sessions"` |

Consequence for the plan: D3-A4 (observability) is not an independent level-B store. It lives
in the same database as `task`, so it is blocked on the same ownership decision as #289.

The schema history of this database is implicit today: Python's `connect()` is the de facto
owner, and Bun is a partial second definer (13-column `tasks`, `task_highwater` alone).

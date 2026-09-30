# Task citation IDs in agent_store.sqlite3 — what is happening

Read only on the real store; the ingest experiment ran on `store-copy.sqlite3` (a copy made for
this analysis, not the live file).

## Measured

| Fact | Value | How |
|---|---|---|
| Rows in `tasks` | 1917, all with `citation_id` | `select count(*), count(citation_id) from tasks` |
| Board cards in this session (`efec8688…`) | 296 | `ls /root/.claude/tasks/<session>/*.json` |
| Of those, with a durable `TASK-*` citation | 22 (28 rows ingested, 6 of them under an old subject) | subject comparison |
| Cards with no durable citation | 274 | idem |
| Stored rows whose subject no longer matches any card (renamed on the board after assigning) | 6: TASK-THYROX-0246 and TASK-THYROX-0267..0271 | idem |
| `task_highwater` in the real store | absent (only Bun declares it; Bun has not opened this file) | `sqlite_master` |
| `task_id` reused across sessions | 333 values | by design: the natural key is `(session_id, task_id)` |

## Two defects

1. **A renamed card assigns a second citation.** `ingest_board` (`src/task/task_ids.py:569-680`)
   deduplicates by `subject` only. The row it inserts gets `task_id = MAX(task_id)+1` of the
   session, not the board ordinal, and the board ordinal is not stored anywhere in the row. When
   a card is renamed on the board, its new subject is unseen, so ingesting it assigns a new
   citation for the same task. Reproduced on the copy: ingesting board #264 (renamed from
   "Coordinación R1 …" to "Estado compartido R1 …") produced `TASK-THYROX-0272` next to the
   existing `TASK-THYROX-0267`. Five other already-assigned tasks of this session are in the same
   state, so assigning the 274 pending cards today would duplicate 6 citations.
2. **This session cited board ordinals in durable text.** CLAUDE.md step 4 requires assigning the
   `TASK-THYROX-NNNN` citation before citing a task. Two commits (`8bb61538`, `de6b1bb1`) and six
   bench files (`items.txt` of three pools, `omniroute-migrations-analysis.md`,
   `task-ownership-measurement.md`, `probe-task-ownership.sh`) cite `#2NN` ordinals. The detector
   `detect_ephemeral_citation` exists but does not fire here: `PreToolUse` hooks are not wired
   under this harness (the inertia `trabajo-en-segundo-plano.md` already declares).

## Order of the fix

1. Fix the ingest identity in TDD: store the board ordinal in the row and deduplicate by
   `(session_id, board ordinal)` before `subject`; a renamed card updates its row's subject and
   keeps its citation. Removal check: without the ordinal key, the rename test assigns a second id.
2. Only then assign the 274 pending cards of this session.
3. Replace the `#NNN` ordinals in the six bench files with their assigned citations. The two commit
   messages stay as they are (history); the finding records them.

## Naming decision for the English rename (2026-09-29)

Decided by the executor: the verb is **assign**, never *mint* — *mint* is a
metaphor, *assign* is the standard term for giving an ID to an object.

| Current (Spanish) | English name |
|---|---|
| subcommand `ingerir-board` | `ingest-board` |
| subcommand `acunar` | `assign-ids` |
| function `mint(mapping, refs)` | `assign_missing_ids` |
| subcommand `cita` | `lookup` |
| subcommand `censo` | `census` |
| subcommand `duplicados` | `duplicates` |
| subcommand `corregir-capa` | `fix-layer` |
| option `--capa` | `--layer` |

Docstring form: "Assigns the missing ID for tasks already in the store; never
renumbers."

You are a Thyrox worker. You run inside your own git worktree of the Thyrox repository; your current directory is its root. You may only use the Bash tool. Each tool call is slow: follow the steps below in order, and NEVER run a command you have already run.

TASK-THYROX-0919: implement `src/verify/search_existing_mechanisms.py` so that the existing test `tests/verify/test_search_existing_mechanisms.py` passes. Do not modify the test.

Turn 1 — Search Existing. Run exactly this one command, once:

    rg -l -e search_existing -e mechanisms.tsv src bin tests; sed -n '1,60p' tests/verify/test_search_existing_mechanisms.py

Turn 2 — Classify, as plain text, without any tool call. Print exactly this block, filled in from Turn 1:

    SEARCH-EXISTING
    capability: answer FOUND/RELATED/NONE for a mechanism query over a TSV registry
    existing authority: <path, or none>
    consumers: <paths, or none>
    tests: tests/verify/test_search_existing_mechanisms.py
    decision: REUSE | EXTEND | MISSING
    reason: <one line>

Turn 3 — Implement, in parts of at most 12 program lines each (a long tool call loses its body). Part 1 is one Bash call whose first line is exactly `cat > src/verify/search_existing_mechanisms.py <<'PY'`, then up to 12 program lines, then `PY` alone. Every next part is one Bash call starting with exactly `cat >> src/verify/search_existing_mechanisms.py <<'PY'`, up to 12 more lines, then `PY`. Nothing after `<<'PY'` on its line. When the program is complete, run `wc -l src/verify/search_existing_mechanisms.py` once. Contract:

- usage: `search_existing_mechanisms.py --registry PATH QUERY...`
- the registry is a TSV; lines starting with `#` are comments; the first non-comment line is the header `id concept authority symbol public_entry tests consumers keywords`.
- rule 1: the whole query (words joined by one space) equals the `id` or the `concept`, ignoring case → `FOUND <id>`.
- rule 2: else, every query word (lower case) appears among the words of `keywords`, `concept` or `id` (split `id` on `-` too) → `FOUND <id>`.
- rule 3: else, some query word appears among the words of `keywords`, or inside `authority`, `symbol` or `public_entry` → `RELATED <id>`.
- rule 4: no row matched → print `NONE`, exit 1.
- after each `FOUND`/`RELATED` line print five lines: `  authority: …`, `  symbol: …`, `  entry: …`, `  tests: …`, `  consumers: …`.
- print every FOUND before any RELATED. Exit 0 when something matched.
- if the registry cannot be read, write the reason to stderr and exit 2 without printing NONE.
- never print the words REUSE, EXTEND or MISSING.
- identifiers in English; comments and docstrings in Spanish; standard library only.

Turn 4 — Test, with this one command:

    python3 tests/verify/test_search_existing_mechanisms.py

If it fails, read the failure, rewrite the program with Turn 3 (parts again, the first one with `>`), then Turn 4 again. Stop when all 8 tests pass. Do not commit; the pool collects your worktree.

# TASK-THYROX-0542

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p10-task-finding-identity.md`

## La tarea

## [299] TASK-THYROX-0542 — Task identity — replace board ordinals in this session's bench files with their durable citations

Status on board: pending

Vía pool, un ítem por banco (disjuntos por archivo; juicio por #N: tarjeta del board, PR u otro). Necesita el mapa ordinal→TASK-THYROX-NNNN de #298. Riesgo: .claude/workbench es ruta sensible para el runner.

## Estado medido por el censo: pendiente

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- Fila de la tarea: status pending, session efec8688-6a45-5d65-b899-cd988aa8816f, board_ordinal 299, creada 2026-09-29T11:40:42 — python3 sqlite3 select * from tasks where citation_id='TASK-THYROX-0542' (store /home/user/thyrox/agent-results/agent_store.sqlite3)
- Ningún commit cita la tarea — git log --oneline --grep='TASK-THYROX-0542' → 0 líneas; git grep 'TASK-THYROX-0542' -- .claude src tests → sólo task-census-20260930T064202/items.txt:8
- Dependencia (#298 = TASK-THYROX-0541) YA satisfecha en el store: 363 filas de la sesión, 363 con board_ordinal y 363 con citation_id (fila de 0541 sigue 'pending' en el board) — python3 sqlite3 count(*) where session_id=… and board_ordinal is not null
- Conjunto objetivo declarado por la sesión: .claude/workbench/task-id-analysis-20260929T073702/README.md (commit 0b5f7a9aa) nombra seis archivos de banco con #2NN: items.txt de tres pools, omniroute-migrations-analysis.md, task-ownership-measurement.md, probe-task-ownership.sh — git show HEAD:…/README.md
- Los tres archivos de datos-d3a0-sync-runner-20260929T072444 siguen con #289 y 0 citas TASK-: omniroute-migrations-analysis.md:21 (#2NN=2, último commit de6b1bb13), probe-task-ownership.sh:2 (#2NN=1, 8bb61538c), task-ownership-measurement.md:1 (#2NN=2, 8bb61538c) — git grep --cached -c '#2[0-9]{2}\b' / -c 'TASK-[A-Z]+-[0-9]{4}' por archivo; git log -1 -- <archivo>
- items.txt con #2NN y sin cita durable: 9 de 11 (credentials-effort, daemon-wave1 (6 hits), daemon-wave2 (6), daemon-wave3-d9, datos-d3a0-sync-runner, datos-d3a0b-contract-v2, pending-six, shared-state-r5, task-identity-board-ordinal); sólo pool-group5 y pool-group6 (09-30) ya llevan TASK-THYROX-NNNN junto al ordinal — git grep --cached -l -E '#2[0-9]{2}\b' -- '.claude/workbench/*/items.txt' + -c TASK-
- Archivos no-artefacto (sin .json/.jsonl/.patch/.log) de dirs 20260929/20260930 con #2NN y sin ninguna cita durable: 36 — git grep --cached -l -E '(^|[^A-Za-z0-9_/&])#2[0-9]{2}\b' -- '.claude/workbench/*20260929*' '.claude/workbench/*20260930*' | comm -12 con git grep --cached -L 'TASK-[A-Z]+-[0-9]{4}'
- Con el patrón exacto del detector (board|tarea|task|tarjeta #N, T-N) y sin cita durable: 240 archivos en todo .claude/workbench, 145 en dirs ≥20260923; de ellos 13 README.md de prosa (p.ej. mitm-f7e-tproxy README.md:12 'tarea #122', session-affinity-port README.md:162 'tarea #90', claude-to-thyrox-census README.md:1 'TASK #67'); 93 de los 145 son .json/.jsonl (67 en notas-ai-course, salidas de pool, no citas del board) — git grep --cached -l -i -E '\b(board|tarea|task|tarjeta) +#[0-9]+\b|\bT-[0-9]+\b' -- .claude/workbench | comm -12 con git grep --cached -L
- Todos los ordinales muestreados resuelven en el mapa del store: #289→TASK-THYROX-0532, #243→0494, #244→0495, #273..#278→0516..0521, #287→0530, #294→0537, #268→0271, #297→0540, #67→0319, #62→0314, #122→0374, #90→0342 — python3 sqlite3 select citation_id where session_id=… and board_ordinal=N
- Riesgo declarado en la tarea confirmado en código: src/session/item_worktree.sh:28-31,62-63 — el runner trata /.claude/ como segmento sensible y rechaza Write/Edit en modo -p; el worktree del ítem vive en .thyrox/pool-worktrees y el pool le da sólo Bash por defecto — sed -n 28,36p; grep -n '\.claude' src/session/item_worktree.sh
- Este worktree es sparse checkout que EXCLUYE .claude/workbench (555 dirs versionados, 1 en disco): git config core.sparseCheckout → true; git sparse-checkout list → '!/.claude/workbench/…'; git ls-files .claude/workbench | wc -l → 30709. Toda la medición fue sobre el índice (git grep --cached / git show HEAD:)
- Gate existente y verde: python3 tests/hooks/test_detect_ephemeral_citation.py → 12 ok, 0 fallo(s)

## Lo que falta — tu alcance

- Reemplazar (o acompañar con su cita) #289 en los tres archivos de datos-d3a0-sync-runner-20260929T072444 por TASK-THYROX-0532
- Añadir la cita durable junto al ordinal en los 9 items.txt de dirs 20260929 que sólo llevan #2NN (los ordinales resuelven en el store: 243/244→0494/0495, 273-278→0516-0521, 287→0530, 294→0537, 268→0271, 297→0540)
- Decidir y aplicar el juicio por #N en los 13 README.md de prosa de dirs 20260927-20260929 que citan 'tarea #N'/'TASK #N' sin cita durable (todos resuelven en el mapa; ninguno es PR)
- Los outputs/index.tsv y joblog.tsv con #2NN son registros de ejecución del pool: declarar si se tocan o se dejan como historia (el análisis de la sesión sólo obliga a los seis archivos de banco, no a los artefactos)
- Verificar al cerrar: git grep --cached -l -E '#2[0-9]{2}\b' -- '.claude/workbench/*/items.txt' | xargs -I{} git grep --cached -L 'TASK-[A-Z]+-[0-9]{4}' -- {} → 0
- Cerrar la tarjeta #299 y la #298 en el board (el store ya tiene el mapa pero la fila de 0541 sigue 'pending')

## Archivos que te pertenecen

- .claude/workbench/datos-d3a0-sync-runner-20260929T072444/omniroute-migrations-analysis.md
- .claude/workbench/datos-d3a0-sync-runner-20260929T072444/task-ownership-measurement.md
- .claude/workbench/datos-d3a0-sync-runner-20260929T072444/probe-task-ownership.sh
- .claude/workbench/{credentials-effort-20260929T004332,daemon-wave1-20260929T071810,daemon-wave2-20260929T204500,daemon-wave3-d9-20260929T212438,datos-d3a0-sync-runner-20260929T072444,datos-d3a0b-contract-v2-20260929T073547,pending-six-20260929T005934,shared-state-r5-20260929T214651,task-identity-board-ordinal-20260929T080000}/items.txt
- .claude/workbench/{claude-to-thyrox-census-20260927T084825,env-rename-phase-b-20260927T173715,fast-mode-pool-unbounded-20260929T000919,identifiers-thyrox-20260927T165232,mitm-f7c-pool-20260928T052839,mitm-f7e-tproxy-20260928T060215,nested-manifest-removal-20260927T070827,session-affinity-port-20260927T184048,session-headers-20260927T183409,visible-text-thyrox-20260927T152804}/README.md

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- tests/hooks/test_detect_ephemeral_citation.py: 12 ok, 0 fallos (gate existente; no mide el banco, mide el hook)
- Prueba de cierre a escribir o correr a mano: git grep --cached sobre .claude/workbench con el patrón del detector y sin cita durable en el mismo archivo → 0 en los archivos tocados (hoy 240 en todo workbench, 145 en dirs ≥20260923)

## Dependencias

- TASK-THYROX-0541 (#298): el mapa ordinal→cita ya existe en el store (363/363 filas con board_ordinal y citation_id), así que no bloquea; sólo falta cerrar su tarjeta

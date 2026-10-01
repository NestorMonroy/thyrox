# TASK-THYROX-0277

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p11-loose.md`

## La tarea

## [13] TASK-THYROX-0277 — Mapear los 2947 conceptos filtrados a thyrox con headless-pool

Status on board: pending

356 notas, un claude -p por nota; veredictos YA-EXISTE/PARCIAL/AUSENTE-APLICABLE/NO-APLICA con evidencia; agregar y adoptar los AUSENTE-APLICABLE.

## Estado medido por el censo: parcial

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- 2947 conceptos filtrados: .claude/workbench/notas-ai-course-aplicables-a-thyrox-20260924T030740/outputs/conceptos-filtrados.jsonl, 2947 líneas sobre 356 notas distintas (claves nota/concepto/problema/patron/limite) — `wc -l` + python json; traído por commit 04596b789 (2026-09-24, 'Record the concept-mapping run and its job logs'), versionado en HEAD e77250e82 (`git ls-files … | wc -l` → 1078 en outputs/mapeo; el worktree es sparse y no lo materializa)
- 356 notas, un `-p` por nota: outputs/mapeo/items.txt 356 líneas; entrada/ 356 .jsonl; todas/index.tsv 356; todas/*.json 356, todas/*.err 356 (todos vacíos) — `wc -l`, `ls | wc -l`
- corrida del pool: todas/joblog.tsv Exitval 0×353, 1×3 — `awk -F'\t' 'NR>1{c[$7]++}'`; los 3 con exit 1 son result/error_max_turns: ítems 51 cs146s_week01, 256 modern-agent_lecture12, 343 youtube_zhangxiaojun_ep132 (15 conceptos entre los tres, `wc -l` de sus entradas)
- veredictos con el vocabulario pedido: prompt en probes/prompt-mapeo.md:15-26 (YA-EXISTE/PARCIAL/AUSENTE-APLICABLE/NO-APLICA con `donde`/`evidencia`/`propuesta`); parseados de los 353 result: 2904 objetos → NO-APLICA 1653, PARCIAL 531, AUSENTE-APLICABLE 385, YA-EXISTE 332, AUSENTE 3 (fuera de vocabulario) — python re/json sobre todas/*.json
- agregación: sólo outputs/mapeo/parcial-veredictos.jsonl con 458 filas (de 2904) y sin campo de nota — `wc -l` + python; outputs/commit-mapeo.txt:6-8 lo declara: 'kept as evidence of that run, not as a finished mapping'
- adopción: 0 hallazgos y 0 tareas del store citan outputs/mapeo, prompt-mapeo ni los 385 AUSENTE-APLICABLE — sqlite sobre findings_history/tasks; `git grep -n -E 'outputs/mapeo|prompt-mapeo|2947 conceptos' -- src tests .claude/rules` → 0; los detectores adoptados (detect_edit_loop.py:3, detect_irreversible_operation.py:3, subagentLimits.ts:17) citan las propuestas 2-4 del consolidado G1-G5 (165 ideas), no el mapeo de 2947
- banco sin cerrar: README.md del banco es la plantilla vacía (encargo, piezas, métrica, ciega a sin rellenar) — `cat README.md`
- mecanismo headless-pool: tests/session/test-headless-pool.sh → 129 de 129 aserciones, exit 0, con `</dev/null` (la primera corrida con stdin del anfitrión agotó `timeout 110`)

## Lo que falta — tu alcance

- Reejecutar los 3 ítems error_max_turns (51, 256, 343; 15 conceptos) con más turnos o partidos, y dejar sus .json en todas/
- Agregar los 2904+ veredictos en una tabla por nota y concepto (nota, concepto, veredicto, donde, evidencia, propuesta) que sustituya a parcial-veredictos.jsonl (458 filas, sin nota); declarar los 43 conceptos sin veredicto (2947−2904) y los 3 'AUSENTE' fuera de vocabulario
- Deduplicar y ordenar los 385 AUSENTE-APLICABLE, contrastando cada uno contra el árbol actual (varios ya pueden ser YA-EXISTE tras los commits del 24 al 30) y contra las 33 propuestas del consolidado
- Adoptar los AUSENTE-APLICABLE que sobrevivan: una tarea TASK-THYROX-NNNN por pieza y hallazgo con `bin/agent_store agregar-hallazgo` citando outputs/mapeo
- Rellenar README.md del banco (encargo, piezas, métrica, ciega a) y commitear por pathspec

## Archivos que te pertenecen

- .claude/workbench/notas-ai-course-aplicables-a-thyrox-20260924T030740/README.md
- .claude/workbench/notas-ai-course-aplicables-a-thyrox-20260924T030740/outputs/mapeo/todas/{51,256,343}.json
- .claude/workbench/notas-ai-course-aplicables-a-thyrox-20260924T030740/outputs/mapeo/veredictos.tsv (nuevo, agregado completo)
- .claude/workbench/notas-ai-course-aplicables-a-thyrox-20260924T030740/outputs/ausentes-aplicables.md (nuevo, deduplicado)
- agent-results/agent_store.sqlite3 (tareas y hallazgos de adopción)

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- tests/session/test-headless-pool.sh: 129 de 129, exit 0 (medido con </dev/null)
- por escribir: un check que cuente veredictos por nota contra conceptos-filtrados.jsonl y exija 0 sin veredicto y 0 fuera de vocabulario (python3 tests/session/test_mapeo_veredictos.py o un guion del banco)

## Dependencias

- (ninguno)

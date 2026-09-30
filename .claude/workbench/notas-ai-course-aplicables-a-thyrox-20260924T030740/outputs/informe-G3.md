# G3 — Diseño de herramientas, skills y MCP: aplicabilidad a THYROX

Fecha: 2026-09-24T03:12:58Z. Alcance: `/home/user/thyrox`. Método: cada idea se
mide con `rg`/`find` contra el árbol real, nunca de memoria.

## Tabla resumen

| # | Idea | Nota | Veredicto | Pieza |
|---|---|---|---|---|
| 1 | Namespacing de herramientas por servidor (`mcp__server__tool`) | writing-tools | YA-EXISTE | `src/packages/mcp-runtime/src/mcpStringUtils.ts` |
| 2 | Tope de tamaño de respuesta de herramienta (paginación/truncado) | writing-tools | YA-EXISTE | `src/packages/tool-registry/src/toolLimits.ts` |
| 3 | Consolidar herramientas (no envolver 1:1 la API) | writing-tools | YA-EXISTE (por precedente) | `src/session/bg.sh`, `wait-jobs.sh` |
| 4 | `response_format` enum concise/detailed | writing-tools | AUSENTE-APLICABLE | herramientas propias de thyrox (`bin/*`) |
| 5 | Harness de evaluación de herramientas (tareas realistas, métricas, agente que se auto-optimiza) | writing-tools | AUSENTE-APLICABLE | `src/verify/` nuevo: `eval_tool_quality.py` |
| 6 | Prompt-engineering de descripciones de tool (tratarlas como onboarding de un nuevo integrante) | writing-tools / building-agents (ACI) | PARCIAL | descripciones existen, sin gate de calidad |
| 7 | IDs semánticos en vez de UUID crudo | writing-tools | YA-EXISTE | `TASK-THYROX-NNNN`, `H-<PREFIJO>-NNNN` |
| 8 | Workflows vs Agents (rutas predefinidas vs control dinámico del LLM) | building-agents | YA-EXISTE | `src/packages/agent/`, `Workflow` tool, coordinadores de flow |
| 9 | Routing por dificultad a modelo barato/caro | building-agents | YA-EXISTE | `model-selection-subagents.md` (consumidor) + catálogo de modelos |
| 10 | Orchestrator-workers (delegación dinámica, no predefinida) | building-agents | YA-EXISTE | agentes coordinadores (`*-coordinator.md`) + `Agent` tool |
| 11 | Evaluator-optimizer (loop generación↔crítica) | building-agents | PARCIAL | `agenticValidator`, `deep-review` existen; sin loop automático de reintento |
| 12 | ACI: dar tokens para "pensar" antes de que el modelo se atrape; formato cercano al texto natural | building-agents | NO-APLICA | decisión de diseño del CLIENTE (ya ported), no de THYROX |
| 13 | Poka-yoke de herramientas (forzar rutas absolutas para evitar la clase de error) | building-agents | YA-EXISTE | `FileEditTool`, `FileWriteTool`, `FileReadTool` |
| 14 | 5 patrones de skill (Tool Wrapper, Generator, Reviewer, Inversion, Pipeline) | google-skill-patterns | PARCIAL | Tool Wrapper/Generator sí (`references/`+`assets/`); Reviewer/Inversion/Pipeline no declarados como patrón |
| 15 | Progresive disclosure vía `references/` y `assets/` | dotey | YA-EXISTE | `.claude/skills/*/references`, `.claude/skills/*/assets` |
| 16 | Sección "Gotchas" por skill | dotey | PARCIAL | sólo 1 de 142 skills la tiene (`thyrox/SKILL.md`) |
| 17 | `description` como disparador ("Use when…") | dotey | YA-EXISTE | frontmatter de cada `.claude/skills/*/SKILL.md` |
| 18 | Memoria/datos por skill en carpeta estable (no borrada al actualizar) | dotey | AUSENTE-APLICABLE | mecanismo tipo `${CLAUDE_PLUGIN_DATA}` |
| 19 | Hooks on-demand ligados a una skill (sólo activos mientras dura la sesión de esa skill) | dotey | YA-EXISTE | 13 `SKILL.md` con clave `hooks:` |
| 20 | Composición de skills por referencia de nombre | dotey | AUSENTE-APLICABLE | ninguna skill invoca otra por nombre en su prompt |
| 21 | Medir el uso de skills con hook `PreToolUse` (popularidad/subdisparo) | dotey | AUSENTE-APLICABLE | `src/hooks/` nuevo detector + tabla en `agent_store.sqlite3` |
| 22 | `config.json` de setup + `AskUserQuestion` para parámetros de la skill | dotey | AUSENTE-APLICABLE | ninguna skill trae `config.json` |
| 23 | Loop de auto-mejora de skill por checklist sí/no (autoresearch) | minli | AUSENTE-APLICABLE | `src/verify/skill_autoresearch.py` nuevo |
| 24 | Subagentes NO comparten memoria — todo se pasa explícito en el prompt | hooeem D1 | PARCIAL | cierto por arquitectura; no está escrito como regla en `.claude/rules/` de thyrox |
| 25 | Prerequisite gates programáticos (bloquear, no sólo avisar) en operaciones críticas | hooeem D1 | AUSENTE-APLICABLE | `src/hooks/` — hoy los 25 detectores sólo avisan |
| 26 | Anti-patrones de terminación de loop (parsear texto, tope de iteraciones como único freno, "hay texto del asistente" como señal de fin) | hooeem D1 | PARCIAL | `stop_gate.py`/`stop_pending_work.py` sí exigen evidencia; no hay barrido que prohíba los tres explícitamente |
| 27 | `tool_choice` auto/any/forzado, y alcance de 4-5 tools por subagente | hooeem D2 | PARCIAL | `tool_choice` forzado sí se usa internamente; sin regla que acote tools por agente |
| 28 | Reglas `paths:`/glob por dominio, distintas de un `CLAUDE.md` de directorio | hooeem D3 | YA-EXISTE | `src/rules/types.ts` (`domain` con `n`/globs) |
| 29 | `context: fork` en skill para aislar salida verbosa | hooeem D3 | YA-EXISTE | citado en `.claude/skills/thyrox/SKILL.md:825` |
| 30 | Modo `-p`/`--print` no interactivo para CI/CD | hooeem D3 | YA-EXISTE | `src/packages/cli/src/entry/run-program.ts` |
| 31 | Revisión independiente vs auto-revisión | hooeem D3 | PARCIAL | `pmExecuting.prompt.md` la menciona; no hay skill "adversarial-review" con ojos frescos |
| 32 | Few-shot dirigido como técnica de mayor apalancamiento en prompts de tool | hooeem D4 | NO-APLICA | es técnica de *quien construye* un skill/tool, no infraestructura que THYROX deba tener |
| 33 | Message Batches API (async, 50% ahorro) | hooeem D4 | NO-APLICA | THYROX no llama a la Anthropic API directamente; su paralelismo es de proceso (`run-task-pool`), no de la API de batches |
| 34 | "Case facts" persistentes, nunca resumidas | hooeem D5 | YA-EXISTE (instancia acotada) | `task_ids.py` + `detect_ephemeral_citation.py` (CLAUDE.md paso 4) |
| 35 | "Lost in the middle": resúmenes clave al inicio del prompt | hooeem D5 | AUSENTE-APLICABLE | ningún agente/skill lo declara como regla de estructura |
| 36 | Disparadores de escalación fiables (pedido humano explícito, vacío de política, imposibilidad) vs no fiables (sentimiento, confianza autoreportada) | hooeem D5 | NO-APLICA | THYROX no tiene agentes de cara al cliente con escalación humana |
| 37 | Propagación estructurada de error (tipo, intento, parcial, alternativas) vs supresión silenciosa | hooeem D5 | PARCIAL | `error_log.py`/`toolErrors.ts` existen; sin esquema de 4 campos declarado |
| 38 | Carga dinámica de skill vía `cat` de `SKILL.md` completo disparado por coincidencia de query | lecture14 | YA-EXISTE | `src/packages/command-runtime/**/loadSkillsDir.ts` (carga completa al activar) |
| 39 | Skill maestra con frase de disparo obligatoria ("si crees que hay 1% de posibilidad, úsalo") | lecture14 | AUSENTE-APLICABLE | `.claude/skills/thyrox/SKILL.md` |
| 40 | Flujo formalizado en lenguaje Dot/Graphviz dentro del skill | lecture14 | AUSENTE-APLICABLE (bajo valor) | ningún `SKILL.md` lo usa; ver razón en el detalle |
| 41 | Brainstorming: una pregunta confirmatoria a la vez, prohibido código, produce Design Doc | lecture14 | AUSENTE-APLICABLE | `workflow-discover`/`workflow-strategy` no lo exigen así |
| 42 | Writing Plans: plan ejecutable "sin contexto" (ruta exacta, comando exacto, para que otro agente lo ejecute a ciegas) | lecture14 | PARCIAL | `workflow-decompose` produce T-NNN atómicas; sin el requisito explícito "otro ingeniero sin contexto" |
| 43 | TDD rojo-verde-refactor con "ver fallar el test con los propios ojos" | lecture14 | YA-EXISTE | `CLAUDE.md` paso 3 + `evidencia-antes-de-afirmar.md` (control de anulación) |
| 44 | Modos de ejecución: secuencial vs agentes paralelos + aislamiento por worktree | lecture14 | YA-EXISTE | `EnterWorktree`/`ExitWorktree` tools; `run-task-pool.sh` |
| 45 | Depuración sistemática de 4 fases, con escalón a re-diseño tras 3 ciclos sin éxito | lecture14 | AUSENTE-APLICABLE | ninguna skill/regla lo define |
| 46 | Code Review "temprano y frecuente" (por sub-tarea, no sólo antes de mergear) + checklist + reglas para RECIBIR la review (verificar antes de actuar, rebatir con razones) | lecture14 | AUSENTE-APLICABLE | no hay skill de review con esas dos mitades |
| 47 | Skill "Writing Skills": destilar un patrón resuelto en una skill reusable | lecture14 | PARCIAL | `skillGenerator` existe (genera skills), sin el criterio explícito "sólo si es principled y reusable" |

## Detalle por idea (cita verbatim, medición, veredicto)

### 1. Namespacing `mcp__server__tool` — YA-EXISTE

> "namespacing tools by service (e.g., asana_search, jira_search) and by resource…"
> — `articles/anthropic-writing-tools/content.txt` (sección "Namespacing your tools")

```bash
$ rg -n "mcp__" src/packages/mcp-runtime/src/mcpStringUtils.ts | head -3
export function getMcpPrefix(serverName: string): string {
  return `mcp__${normalizeNameForMCP(serverName)}__`
}
```

Veredicto: el propio cliente ya trae namespacing por servidor+recurso, y THYROX lo
porta verbatim (`src/packages/mcp-runtime/src/mcpStringUtils.ts:47-60`).

### 2. Tope de tamaño de respuesta — YA-EXISTE

> "We restrict tool responses to 25,000 tokens by default." — writing-tools content.txt

```bash
$ sed -n '10,20p' src/packages/tool-registry/src/toolLimits.ts
export const DEFAULT_MAX_RESULT_SIZE_CHARS = 50_000
export const MAX_TOOL_RESULT_TOKENS = 100_000
export const MAX_TOOL_RESULTS_PER_MESSAGE_CHARS = 200_000
```

Veredicto: el mecanismo de truncado+paginación/almacenado a disco con vista
previa ya está portado (con topes propios, no 25k, pero la misma forma:
persistir y devolver ruta en vez de contenido).

### 3. Consolidar herramientas — YA-EXISTE (por precedente, no por regla escrita)

> "Instead of implementing a list_users, list_events, and create_event tools,
> consider implementing a schedule_event tool" — writing-tools content.txt

`trabajo-en-segundo-plano.md` ya documenta `bin/thyrox-bg` (lanza + registra en
una sola invocación) y `bin/wait-jobs` (espera + recoge + barrera), que son
exactamente ese patrón — varias operaciones discretas bajo una sola
herramienta de alto nivel. No hay una regla que lo nombre como *principio*
general de diseño, pero la práctica ya lo sigue.

### 4. `response_format` enum — AUSENTE-APLICABLE

```bash
$ rg -n "response_format|ResponseFormat" src -tall 2>/dev/null | grep -v node_modules
(sin resultados)
```

Propuesta: los scripts de `bin/` que ya devuelven texto libre (`wait-jobs
status`, `agent-cost.sh`) podrían aceptar `--format concise|detailed` para que
un agente que sólo necesita el veredicto no pague el volcado completo. Pieza:
extender `src/session/wait-jobs.sh status` y `agent_store.py` con esa bandera.
Test que fallaría sin ella: uno que invoque `wait-jobs status --format
concise` y espere una sola línea `OK|BAIL` en vez del volcado de cola completo.

### 5. Harness de evaluación de herramientas — AUSENTE-APLICABLE

> "Build a few thoughtful tools targeting specific high-impact workflows,
> which match your evaluation tasks" / "we recommend collecting other metrics
> like total runtime… total number of tool calls… tool errors" — writing-tools

```bash
$ rg -il "evaluation.*tool|tool.*evaluation" src/verify src/hooks 2>/dev/null
(sin resultados)
```

THYROX tiene gates de **regla** (`check_*`) y de **hallazgo**, pero ningún
harness que mida si un `bin/*` propio (p. ej. `bounded_scan`, `marker_wait`)
es ergonómico para un agente: cuántas llamadas hace, si falla por parámetros
mal nombrados, si el mensaje de error guía a la corrección. Propuesta: un
`src/verify/eval_tool_ergonomics.py` que corra un puñado de tareas reales
contra `bin/*` y registre tasa de error + llamadas redundantes. Test que
fallaría sin él: hoy no existe ninguna aserción que verifique que un mensaje
de error de `bin/wait-jobs` es accionable (nombra el trabajo culpable) — un
caso adversarial con nombre de trabajo ausente pasaría en silencio.

### 6. Prompt-engineering de descripciones — PARCIAL

> "think of how you would describe your tool to a new hire on your team" —
> writing-tools

Las descripciones existen (`description:` de cada skill, `getlToolPrompt()`
en `ExitWorktreeTool/prompt.ts`) pero no hay gate que las revise contra los
criterios del artículo (parámetros ambiguos tipo `user` en vez de `user_id`,
ejemplos, límites explícitos). `check_vocabulario_prosa.py`-equivalente para
descripciones de tool no existe.

### 7. IDs semánticos — YA-EXISTE

`TASK-THYROX-NNNN` y `H-<PREFIJO>-NNNN` son exactamente el "0-indexed ID
scheme" semántico que el artículo recomienda en vez de UUID: greppeable,
legible, resuelve siempre al mismo sujeto (`src/task/task_ids.py`,
`src/hallazgo/hallazgo_ids.py`).

### 8-13. Building effective agents — building-agents/content.txt

```bash
$ find src/packages/agent -maxdepth 1 -name "*.ts" | wc -l
```

`src/packages/agent/` implementa el bucle agente↔herramienta con
`forkedAgent.ts`, y el `Workflow` tool (citado en varias reglas de
`bash-background-tasks.md`) es la forma "workflow" (rutas predefinidas) frente
al `Agent` tool dinámico ("agent" propiamente dicho) — la distinción
Workflow/Agent del artículo ya es una distinción viva en el vocabulario del
proyecto. Orchestrator-workers: los 31 `*-coordinator.md` en
`src/agents/definitions/` delegan dinámicamente en skills según el knowledge
area detectado (ver `ba-coordinator.md`, que no fija de antemano qué
`ba-*` skill usar). Evaluator-optimizer existe a medias:
`agenticValidator.ts`/`deep-review.prompt.md` dan la mitad "evaluador", pero
no hay un *loop* automático que reintente hasta convergencia — eso es lo que
la nota 23 (autoresearch) cubriría si se portara. Poka-yoke de ruta absoluta
—citado en el artículo como el ejemplo estrella de SWE-bench— ya está en las
tres herramientas de archivo (`FileEditTool/types.ts:8`,
`FileWriteTool/FileWriteTool.ts:61`, `FileReadTool/FileReadTool.ts:227`).

### 14-15. Patrones de skill / progressive disclosure — google-agent-skill-patterns

```bash
$ find .claude/skills/ba-elicitation -maxdepth 1
.claude/skills/ba-elicitation/SKILL.md
.claude/skills/ba-elicitation/assets
.claude/skills/ba-elicitation/references
```

El patrón **Tool Wrapper** (cargar `references/` bajo demanda) y el
**Generator** (plantilla en `assets/` + instrucciones que la rellenan) ya
están instanciados en las 142 skills de `src/skills/definitions/` emitidas a
`.claude/skills/`. Los patrones **Reviewer** (rúbrica modular en
`references/review-checklist.md`), **Inversion** (el agente entrevista antes
de actuar, con gate explícito "no sintetices hasta que…") y **Pipeline**
(checkpoints diamante con aprobación humana entre fases) no están declarados
como forma reusable en ninguna skill — cada una resuelve su propio flujo sin
nombrar el patrón.

### 16. Sección "Gotchas" — PARCIAL

```bash
$ rg -il "gotcha" .claude/skills
.claude/skills/thyrox/SKILL.md
```

Sólo la skill maestra (`thyrox/SKILL.md:247-295`, con 5 gotchas nombrados)
tiene la sección. Ninguna de las 142 skills de dominio (`ba-*`, `bpa-*`,
`pdca-*`, `lean-*`…) la trae, aunque cada una acumula ya experiencia de uso
(ver por ejemplo las advertencias sueltas dentro de `baElicitation.prompt.md`,
que podrían mudarse a una sección con ese nombre).

### 18. Memoria de skill en carpeta estable — AUSENTE-APLICABLE

> "Data stored in the skill directory may be deleted when you upgrade the
> skill… we provide `${CLAUDE_PLUGIN_DATA}` as a stable folder per plugin" —
> dotey original_content.txt

```bash
$ rg -n "CLAUDE_PLUGIN_DATA|PLUGIN_DATA" src .claude 2>/dev/null | grep -v node_modules
(sin resultados)
```

THYROX ya tiene el mismo problema en potencia: sus skills se emiten
(`src/skills/emit/`) y se regeneran; cualquier dato que una skill quisiera
guardar dentro de su propio directorio se perdería en la próxima emisión.
Propuesta: una convención `THYROX_SKILL_DATA_DIR` fuera de `src/skills/` (p.
ej. bajo `agent-results/skill-data/<skill>/`), documentada como la regla
"memoria de skill", análoga a `${CLAUDE_PLUGIN_DATA}`. Test que fallaría sin
ella: regenerar `.claude/skills/` con `emit/` y comprobar que un archivo
`standups.log` escrito dentro de una skill sobrevive — hoy no sobreviviría
porque `emit/` sobreescribe el directorio entero.

### 20. Composición de skills por nombre — AUSENTE-APLICABLE

> "you can just reference other skills by name, and the model will invoke
> them if they are installed" — dotey

```bash
$ rg -n "invocar.*skill|Skill\(" src/skills/definitions/*.prompt.md 2>/dev/null
(sin resultados)
```

Los 31 coordinadores (`ba-coordinator.md`, etc.) declaran una lista
`skills:` en el frontmatter, pero ninguna skill de dominio *dentro de su
propio prompt* dice "si el usuario necesita X, invoca la skill Y". Es una
capacidad muerta parcial: el mecanismo de invocación existe (`Skill tool`),
pero el patrón de composición explícita documentado por Anthropic no está
escrito como convención.

### 21. Medir uso de skills — AUSENTE-APLICABLE

> "we use a PreToolUse hook that lets us log skill usage within the company…
> find skills that are popular or are undertriggering" — dotey

```bash
$ rg -il "skill.*usage|skill_invoc|triggered_skill" src/hooks 2>/dev/null
(sin resultados)
```

`agent_store.sqlite3` ya guarda `retention_level`, `turns`, tokens por
sesión (`niveles-de-retencion.md`), pero **no** qué skill se disparó. Sin ese
dato no se puede saber si `ba-elicitation` se usa alguna vez o si
`pdca-check` está muerta. Propuesta: un detector `PreToolUse` sobre el tool
`Skill` que anote `(skill_name, session_id, timestamp)` en una tabla nueva
del store, y un comando `agent_store.py skills-mas-usadas`. Test que fallaría
sin él: hoy, preguntando "¿qué skill de las 142 nunca se disparó en 90 días?"
no hay ninguna fuente que lo responda.

### 22. `config.json` + `AskUserQuestion` — AUSENTE-APLICABLE

```bash
$ find .claude/skills -iname "config.json"
(sin resultados)
```

Ninguna skill de THYROX pide parámetros de sesión (p. ej. "¿en qué directorio
de trabajo?", "¿qué convención de commit usa este consumidor?") vía un
`config.json` + pregunta estructurada. Hoy esos parámetros viven repartidos en
prosa de cada `.rst` de consumidor. Baja prioridad: la mayoría de las skills
de THYROX son metodológicas y no necesitan credenciales/IDs de canal como los
ejemplos del artículo (Slack channel).

### 23. Autoresearch: loop de auto-mejora de skill por checklist — AUSENTE-APLICABLE

> "56% → 92%. 4 rounds of changes. 3 kept, 1 undone… Score chart going up
> over time… A changelog explaining every change that was tried" — minli
> original_content.txt

```bash
$ rg -il "autoresearch|hillclimb|pass_rate|passRate" -tall . 2>/dev/null | grep -v _references | grep -v node_modules
(sin resultados)
```

Es la propuesta de mayor apalancamiento del lote: THYROX ya tiene 142
skills, un mecanismo de emisión determinista (`src/skills/emit/`) y una
suite TDD — todo lo que el método necesita (una skill "recipe", una forma de
"cocinarla" —correr la skill contra una tarea de ejemplo— y un "checklist" de
sí/no). Hoy no existe el ciclo de: correr → puntuar contra checklist → si
sube, quedarse el cambio; si baja, revertir → repetir con changelog. Pieza:
`src/skills/eval/skill_autoresearch.py`, que tome una skill + una lista de
preguntas sí/no + N tareas de prueba, y produzca `changelog-<skill>.rst` +
`score-<skill>.json`. Test de aceptación: sobre una skill con un defecto
inyectado a propósito (p. ej. una instrucción ambigua que hace fallar 3 de 5
checks), el loop debe subir el `pass_rate` medido y dejar registrado qué
cambio lo logró — y NO debe quedarse con un cambio que hizo bajar el score
(control de "revertir si empeora").

### 24. Aislamiento de memoria entre subagentes — PARCIAL

> "The single biggest mistake: people assume subagents share memory with the
> coordinator. They do not." — hooeem, Domain 1

```bash
$ rg -n "no comparte memoria|contexto aislado|isolated context" .claude/rules
(sin resultados)
```

El hecho es cierto por arquitectura (cada `Agent` corre en su propio proceso
de conversación, ver `bash-background-tasks.md` sección "Un par NO te
concede resultados/permisos" en el consumidor, que asume esto implícitamente
al hablar de `SendMessage`). Pero THYROX —el proveedor— no lo declara como
regla explícita en sus propios `.claude/rules/`, que hoy son sólo 7 archivos
y ninguno lo menciona. Sería una línea barata de añadir a
`trabajo-en-segundo-plano.md` o a una regla nueva de diseño de agentes.

### 25. Prerequisite gates que BLOQUEAN — AUSENTE-APLICABLE

> "when stakes are financial or security-critical, prompt instructions alone
> are not enough. You must be enforcing tool ordering programmatically with
> hooks and prerequisite gates." — hooeem, Domain 1

```bash
$ rg -n '"block"|decision.*block' src/hooks/*.py
src/hooks/stop_gate.py:202:        return {"decision": "block", "reason": reason}
```

Único bloqueo real del árbol: el `Stop` hook. Los 10 detectores de
`pretooluse_dispatch.py` (`detect_unbounded_traversal`, `detect_self_matching_pgrep`,
etc.) **avisan, no bloquean**, por decisión de diseño documentada
repetidamente ("un patrón léxico no discrimina..."). Eso es correcto para
patrones léxicos que no pueden distinguir un caso legítimo de uno malo. Pero
hay al menos una clase de operación donde la irreversibilidad sí lo
justificaría: un `git push --force` a una rama compartida, o un `Artifact
delete`. Propuesta: un noveno mecanismo — no un detector léxico, sino un
`PreToolUse` que compruebe una precondición **objetiva** (p. ej. "¿hay un
`git status` limpio antes de un `reset --hard`?") y bloquee de verdad si no
se cumple, en vez de avisar. Test que fallaría sin él: un `git reset --hard`
con cambios sin commitear debería fallar el hook con `decision: block`; hoy
ningún hook de `PreToolUse` lo evalúa.

### 28-30. CLAUDE.md hierarchy / `paths:` / `context:fork` / `-p` — YA-EXISTE

```bash
$ rg -n "domain.*gobierna un dominio" src/rules/types.ts
 * - `domain`: gobierna un dominio. Se emite CON `n`, y sin él no se
```

`src/rules/types.ts` ya declara el eje `universal` vs `domain` (con
`paths`/glob, nombrado internamente `n`) — exactamente el "path-specific
rules… glob patterns" que el examen de hooeem señala como "sleeper concept".
`context:fork` está documentado en
`.claude/skills/thyrox/SKILL.md:825` (referencia a
`command-execution-model.md`). El flag `-p`/`--print` headless para CI/CD
está portado en `src/packages/cli/src/entry/run-program.ts:394-403`.

### 34. "Case facts" nunca resumidas — YA-EXISTE (instancia acotada)

> "Progressive summarisation kills transactional data. Fix: persistent
> 'case facts' block with extracted amounts, dates, order numbers. Never
> summarised." — hooeem, Domain 5

`CLAUDE.md` paso 4 obliga a acuñar `TASK-THYROX-NNNN` **antes** de citar una
tarea propia, precisamente porque el ordinal `#NNN` del board es efímero y
"reinicia por sesión" — el mismo defecto de fondo (un dato transaccional que
la compactación/rotación de contexto destruye) con el mismo remedio (un
identificador durable que se escribe una vez y no se vuelve a resumir). El
gate `detect_ephemeral_citation.py` es el control de anulación de esa
garantía. Es una instancia concreta del principio, no una infraestructura
general reusable para "cualquier dato transaccional" — de ahí que no sea
NO-APLICA sino YA-EXISTE acotado.

### 35. "Lost in the middle" — AUSENTE-APLICABLE

```bash
$ rg -il "lost.in.the.middle|resumen.*al principio|summary.*at.*beginning" src/packages .claude/rules 2>/dev/null
(sin resultados)
```

Ningún prompt de skill o de agente de THYROX declara la regla "coloca el
resumen clave al inicio, no al final, porque el modelo pierde lo que está en
medio de un contexto largo". Es barata de aplicar a los prompts largos que sí
existen (p. ej. `baElicitation.prompt.md`, 174 líneas). Propuesta: una
convención de estilo para `*.prompt.md` — la tabla/resumen de "Cuándo usar /
Cuándo NO usar" va **antes** de la tabla de técnicas detalladas, no después
— y un lint que la verifique contando la posición relativa de encabezados
`## Cuándo`.

### 38-44. Carga de skill / master skill / TDD / worktree — lecture14

```bash
$ rg -n "digraph|graphviz" .claude/skills src/skills 2>/dev/null
(sin resultados)
```

La carga dinámica (query → match → `cat` del `.md` completo) ya es el
mecanismo del cliente que THYROX porta en `loadSkillsDir.ts` del
`command-runtime`. El TDD rojo-verde con evidencia real ya es la forma
central de `evidencia-antes-de-afirmar.md` y del flujo de sesión del
`CLAUDE.md` ("mitad roja persistida y su control de anulación"). El
aislamiento por worktree ya existe como herramienta nativa portada
(`EnterWorktree`/`ExitWorktree`). Lo que falta y es barato: el flujo formal
en Dot/Graphviz dentro de una skill — se marca **AUSENTE-APLICABLE de bajo
valor**, porque THYROX ya usa tablas Markdown y frontmatter YAML como forma
"formalizada" preferida por su propia regla `identificadores-en-ingles.md` y
el resto del corpus; introducir un segundo lenguaje formal (Dot) competiría
con esa convención sin evidencia de que el modelo lo procese mejor que una
tabla. Se deja anotado, no propuesto como pieza concreta.

La frase de disparo obligatoria ("si crees que hay 1% de posibilidad, úsalo")
sí es aplicable y barata: hoy `.claude/skills/thyrox/SKILL.md` no la trae, y
sería una línea en su cabecera junto a la tabla de namespaces existente.

### 45-46. Depuración sistemática de 4 fases / Code Review temprano — AUSENTE-APLICABLE

```bash
$ rg -il "debugging|depurac" src/skills/definitions 2>/dev/null
(sin resultados)
```

THYROX no tiene una skill de depuración sistemática (root cause → patrón →
hipótesis → fix mínimo + verificación, con escalón a rediseño tras 3
ciclos), ni una skill de "solicitar review" + "recibir review" con las
reglas de comportamiento que la nota describe (no decir "se ve bien" sin
mirar, no fragmentar entendido/no-entendido, rebatir con razones técnicas en
vez de aceptar performativamente). Ambas encajarían como `workflow-*`
adicionales o como secciones nuevas de `workflow-pilot`/`workflow-track`.

## Las 5 propuestas de mayor valor

1. **Loop de auto-mejora de skill por checklist (autoresearch), idea 23.**
   Test de aceptación: sobre una skill con un defecto inyectado, el `pass_rate`
   medido sube y el cambio que lo causó queda en `changelog-<skill>.rst`; un
   cambio que empeora el score se revierte automáticamente (control de
   anulación verificable en la suite).
2. **Prerequisite gate que BLOQUEA operaciones irreversibles, idea 25.**
   Test de aceptación: un `git reset --hard`/`push --force` con working tree
   sucio produce `decision: block` desde un `PreToolUse`, no sólo un aviso; el
   mismo comando con tree limpio pasa.
3. **Medir el disparo de skills con un hook, idea 21.**
   Test de aceptación: tras invocar una skill en una sesión de prueba,
   `agent_store.py skills-mas-usadas` la lista con conteo ≥1; una skill nunca
   invocada aparece con conteo 0, no ausente de la tabla.
4. **Memoria de skill en carpeta estable fuera de `emit/`, idea 18.**
   Test de aceptación: regenerar `.claude/skills/` con `src/skills/emit/` dos
   veces seguidas, con un archivo escrito por la skill entre medias — el
   archivo sobrevive a la segunda emisión.
5. **Sección "Gotchas" y "1% de probabilidad" en el resto de skills, ideas 16
   y 39.** Test de aceptación: un gate (`check-skill-artifacts.sh` extendido)
   reporta cuántas de las 142 skills declaran `## Gotchas`, y la cifra sube al
   tocar cada skill (criterio prospectivo, no barrido — mismo patrón que
   `porte-completo-no-parcial.md`).

---

Métrica: cobertura de la idea en el árbol de THYROX medida por `rg -n`/`find`
sobre `src/`, `.claude/skills/`, `.claude/rules/` y `src/hooks/`, con la cita
exacta de archivo:línea cuando hay coincidencia.
Ciega a: capacidades del CLIENTE que THYROX aún no ha portado a `src/packages/`
(no se buscaron ahí sistemáticamente más allá de lo citado); a convenciones que
viven sólo en la prosa de los consumidores `kaupamex-*` y no en THYROX mismo —
un patrón "YA-EXISTE" en un consumidor y ausente en el proveedor se marcó
PARCIAL o AUSENTE según corresponda al alcance del encargo (THYROX); y a si un
mecanismo declarado "avisa, no bloquea" es la elección correcta para su propio
caso — eso lo decide quien lo escribió, no este barrido.

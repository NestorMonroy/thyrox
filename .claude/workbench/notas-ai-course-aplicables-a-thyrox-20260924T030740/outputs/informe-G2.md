# Informe G2 — internos de un coding agent (Codex desarmado, Claude Code según su autor)

Grupo de notas: `modern-agent/lecture{12,13,15,16,17}`, `cs146s/week{02,04}`,
`talks/no-priors/karpathy-code-agents`. Medido contra
`/home/user/thyrox/src` y `/home/user/thyrox/.claude/rules` con `rg`/`find`
en esta sesión (comandos y salidas citados por idea, no de memoria).

**Precaución de fuente, declarada una vez:** las cinco lecciones
`modern-agent` describen **Codex** (OpenAI), no Claude Code. thyrox
reimplementa el binario de **Claude Code**, así que una idea de Codex sólo
es aplicable si no contradice el contrato de Claude Code — el veredicto lo
dice explícitamente cuando hay divergencia de contrato.

## Tabla resumen

| # | Idea | Nota | Veredicto | Pieza de thyrox |
|---|---|---|---|---|
| 1 | Mensajes pre-inyectados (System→Developer→User→Developer) antes del primer turno del usuario | lect.12 | YA-EXISTE | `src/packages/agent/loop/index.ts`, `messages.ts`, `<system-reminder>` (28 archivos) |
| 2 | "Inyección legítima de prompt" — el propio cliente inyecta contexto de sistema | lect.12 | YA-EXISTE | mismo mecanismo; declarado en las reglas de THYROX (`identificadores-en-ingles.md` cita `<system-reminder>`) |
| 3 | Skills con carga progresiva (índice → `cat` bajo demanda) | lect.12/13 | YA-EXISTE | `src/packages/skills`, `registerSkillHooks.ts`, `loadAgentsDir.ts` |
| 4 | Compact preserva mensajes de sistema, comprime sólo el histórico multi-turno | lect.12/15 | YA-EXISTE | `src/packages/agent/compaction/{compact,prompt,autoCompact}.ts` |
| 5 | Trigger automático de compact al 90% de la ventana | lect.15 | YA-EXISTE (superado) | `snipCompactCore.ts:104` (0.9×umbral) + nudge al 80% |
| 6 | Compact en dos pasos: prompt de compresión + prompt de handoff | lect.15 | YA-EXISTE (superado) | `compaction/prompt.ts` — BASE/PARTIAL con 6+ secciones, más detallado que `compact.prompt.md`/`summary.prefix.md` de Codex |
| 7 | Skills vs Tools ortogonales — Skills en `content`, Tools en el campo `tools` | lect.13 | YA-EXISTE | `src/packages/skills` (contenido) vs `src/packages/tool-registry` (schema) — arquitecturas separadas |
| 8 | Agent Runtime vs Agent Loop como dos capas distintas | lect.13 | YA-EXISTE | `src/packages/agent/loop/` (loop) vs `agentContext.ts`/`host.ts` (runtime) |
| 9 | `output_schema` del tool NO se serializa hacia la API | lect.16 | YA-EXISTE | `Tool.ts:458` (`outputSchema` es campo interno; 0 hits en `provider/src/*.ts`) |
| 10 | Apply Patch: DSL Lark con `*** begin/update/add/delete patch` | lect.16 | NO-APLICA (contrato distinto) | Claude Code usa `old_string`/`new_string` único (`FileEditTool.ts:138-260`) — el principio "diff estructurado, no reescritura libre" SÍ existe, la forma Lark no |
| 11 | Execute Commands (one-shot) vs Write Stdin (interactivo) | lect.16 | PARCIAL | `BashTool` cubre one-shot; sin equivalente a stdin persistente a un proceso vivo (REPL) |
| 12 | Sistema de 5 tools de subagente: spawn/send_input/wait/close/resume | lect.16 | PARCIAL | `AgentTool.tsx` (spawn=fork), `resumeAgent.ts` (resume), `SendMessageTool.ts` (send); sin `wait` explícito con timeout ni `close` — el equivalente es `<task-notification>` async |
| 13 | Si el master no espera, el subagente completado se inyecta como mensaje "User" automáticamente | lect.16 | YA-EXISTE | `<task-notification>` (`localAgentTask.tsx:351`, `messageQueueManager.ts`) |
| 14 | `spawn_agent` sólo si el usuario lo pide explícitamente, o para research profunda de codebase | lect.16 | PARCIAL | `src/hooks/detect_agent_dispatch.py` avisa sobre despacho de trabajo determinista, pero no exige petición explícita del usuario como Codex |
| 15 | View Image: tool separado para decidir cuándo "mirar" una imagen | lect.16 | NO-APLICA (contrato distinto) | Claude Code no lo separa: `FileReadTool` lee imágenes directamente (`FileReadTool.ts:185-251`) — es multimodal por `Read`, no por tool dedicado |
| 16 | Logging de request completo a sqlite vía env var (`CODEX_LOG_REQUESTS`) | lect.16 | PARCIAL | `provider/src/logging.ts` tiene telemetría OTel/eventos, pero no volcado completo del `tools`+`instructions`+`input` a un store local inspeccionable |
| 17 | Plan Mode: exploración no destructiva + `request_user_input` sólo en ese modo; el plan vive en contexto, no en disco | lect.17 | YA-EXISTE (con divergencia) | `EnterPlanModeTool`/`ExitPlanModeV2Tool` existen; `AskUserQuestionTool` **no** está restringido a Plan Mode (divergencia de contrato con Codex) |
| 18 | `update_plan`: schema mínimo `{explanation, plan:[{step,status}]}`, snapshot completo, un solo `in_progress` a la vez | lect.17 | YA-EXISTE | `TodoWriteTool.ts` + `todo/types.ts` — exige "Exactly ONE task must be in_progress" (`prompt.ts:173`), semántica de snapshot idéntica |
| 19 | Tres capas de planificación: Plan Mode / `update_plan` / todo archivado entre sesiones | lect.17 | PARCIAL | Plan Mode + TodoWrite existen (contexto); el tercer nivel (archivo persistente cross-sesión) es responsabilidad del consumidor (`tareas-<slug>.rst`), no del harness |
| 20 | MCP: Host→Client→Server→Tool, M×N → M+N, `tools/list`, stdio/SSE | cs146s w2 | YA-EXISTE | `src/packages/mcp-runtime` (host.ts, clientRuntime.ts, InProcessTransport, mcpWebSocketTransport.ts) |
| 21 | Claude Code: `<system-reminder>` en todas partes contra el context drift | cs146s w2 | YA-EXISTE | igual que idea 1/2 — 28 archivos con el literal |
| 22 | Cuatro técnicas de guía de agente: archivos de comportamiento, Hooks, Commands, Subagents | cs146s w4 | YA-EXISTE | `CLAUDE.md`/`.claude/rules`, `src/packages/agent/hooks/*`, `commands/*`, `AgentTool` |
| 23 | Hooks: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `PreCompact` | cs146s w4 | YA-EXISTE | `agent/hooks.ts`, `agent/types/hooks.ts`, `compaction-deps.ts` (PreCompact) |
| 24 | Mejor práctica: etiquetar/auditar cada diff de agente | cs146s w4 | YA-EXISTE (parcial) | `AgentTool/attributionHooks.ts`, `agentColorManager.ts`; en thyrox consumidor: `agent-results-to-docs.md`, `registro-reportes-agentes.md` |
| 25 | Emparejar modelo con dificultad de la tarea | cs146s w4 | YA-EXISTE (superado) | `model-selection-subagents.md` — tabla de tiers, `effort`, `advisor_rank` medidos contra el binario |
| 26 | Checkpoints/commits frecuentes | cs146s w4 | YA-EXISTE | `git.md` (commit por pathspec), TDD con mitad roja persistida |
| 27 | Workflow explore→plan→confirm→code→commit / TDD / code→screenshot→iterate | cs146s w4 | YA-EXISTE | `docs-design-first-rup.md` (diseño antes de código), `flow-selection-agile.md`, TDD en CLAUDE.md |
| 28 | Macro actions como unidad de trabajo (paquetes de ~20 min, no líneas) | karpathy | PARCIAL | `bash-background-tasks.md` da el mismo criterio para "ancho vs largo"; no hay una unidad de asignación formal en `src/` |
| 29 | Multi-agente = protocolo de fronteras de responsabilidad, no sólo paralelismo | karpathy | YA-EXISTE | `bash-background-tasks.md` — clases 1/2/3 de aislamiento de working tree por rutas declaradas |
| 30 | Harness definido por 4 preguntas: entorno, estabilidad de tools, recuperación de fallo, memoria | karpathy | YA-EXISTE (como diseño) | `src/packages/agent`, `permission/`, `memory/` — las cuatro capas existen como paquetes separados |
| 31 | `spawn_agents_on_csv`: lote de subagentes por fila de CSV | lect.13 | NO-APLICA (contradice el modelo de costo) | thyrox usa `run-task-pool.sh`/`task_pool.py` — lotes de **procesos** (costo 0 tokens), no de agentes, por diseño explícito (`trabajo-en-segundo-plano.md`) |
| 32 | Guardas de concurrencia/profundidad de subagentes (rechazo, no cola) | (contexto de lect.16, medido contra Claude Code real) | AUSENTE-APLICABLE | propuesta abajo |

## Detalle por idea

### 1–2. Mensajes pre-inyectados / inyección legítima — YA-EXISTE

> "在用户发出真实请求之前，Codex 已经预先植入了至少四条消息" — System / Developer / User(agents.md+Skills+entorno) / Developer.
> (`modern-agent/lecture12/lecture12-notes.tex:125-134`)

```
$ rg -c "system-reminder" src/packages/agent/loop/index.ts src/packages/agent/sideQuestion.ts src/packages/agent/attachments.ts src/packages/agent/commands/brief.ts
```
Salida: 4 archivos con hits, 28 archivos en total en `src/packages` (`rg -c ... | grep -v ":0" | wc -l` → 28). El bucle en `loop/index.ts:348` referencia explícitamente el mecanismo: *"el mismo mecanismo `<system-reminder>` del ejecutable"*.

**Veredicto:** YA-EXISTE. La forma de Claude Code (system-reminders repartidos, no cuatro mensajes fijos como Codex) es distinta de la de Codex pero cumple el mismo objetivo — es la forma que el binario que se reimplementa realmente usa.

### 3. Skills con carga progresiva — YA-EXISTE

> "阶段一（注册）：… 只暴露每个 Skill 的名称和简短描述。阶段二（加载）：… 通过 Function Call 执行 cat 命令" (`lecture12:194-201`)

```
$ find src/packages/skills -maxdepth 1
$ rg -n "registerSkillHooks|loadAgentsDir" src/packages/agent/hooks/registerSkillHooks.ts
```
`src/packages/skills` existe como paquete propio; `registerSkillHooks.ts` y `loadAgentsDir.ts` implementan el patrón de índice + carga bajo demanda que el Skill tool de este mismo entorno ya ejercita (la sección de skills disponibles en el prompt de esta sesión es exactamente el "阶段一").

**Veredicto:** YA-EXISTE.

### 4–6. Compact: preserva sistema, dos pasos, trigger al 90% — YA-EXISTE (superado)

> "Compact 压缩的是多轮对话部分的内容，但会保留预注入的系统消息" (`lecture12:189`)
> "当上下文长度达到 Context Window 的 90% 时，系统自动执行一次压缩" (`lecture15:129`)
> Compact Prompt: *"为另一个将接手该任务的 LM 创建一份交接摘要，包含：当前的进度、已经做出的关键决策、…"* (`lecture15:189-198`)

```
$ grep -n "0\.9\|90%" src/packages/agent/compaction/snipCompactCore.ts
snipCompactCore.ts:104:    if (tokenCount < threshold * 0.9) {
snipCompactCore.ts:133: * uso está por debajo del 90% del umbral de auto-compact
```
```
$ sed -n '60,80p' src/packages/agent/compaction/prompt.ts
BASE_COMPACT_PROMPT = "...detailed summary... Primary Request and Intent... Key Technical Concepts... Files and Code Sections... Errors and fixes... Problem Solving... All user messages... Pending Tasks... Current Work... Next Step..."
```

**Veredicto:** YA-EXISTE y con más estructura que la versión de Codex descrita en la nota (que sólo lista 5 puntos genéricos): el prompt de thyrox exige explícitamente preservar verbatim instrucciones de seguridad (`compaction/prompt.ts:52`, línea *"These MUST be preserved verbatim..."*), lo que además conecta con `react-verification-gate.md` §6-bis de este mismo repo (medido: preservar el texto no garantiza que se obedezca — la caducidad del texto del prompt de resumen es un hallazgo YA declarado en las reglas del consumidor).

### 7–8. Skills/Tools ortogonales; Runtime vs Loop — YA-EXISTE

> "Skills… 出现在 message 的 content 字段中… MCP / 内置 Tools：出现在 API 的 tools 字段中" (`lecture13:135-140`)

`src/packages/skills` (contenido inyectado) y `src/packages/tool-registry` (definición de `tools`) son paquetes separados con responsabilidades distintas — confirma la ortogonalidad sin necesidad de una pieza nueva.

**Veredicto:** YA-EXISTE por construcción arquitectónica (la separación de paquetes ya impone la ortogonalidad).

### 9. `output_schema` no viaja al API — YA-EXISTE

> "output_schema 不会出现在发给远端 API 的请求体中… 模型对输出结构的感知，完全依赖于 runtime 将 function call output 回填到上下文中" (`lecture16:150-155`)

```
$ grep -n "outputSchema" src/packages/tool-registry/src/Tool.ts
Tool.ts:458:  outputSchema?: z.ZodType<unknown>
$ rg -n "outputSchema" src/packages/provider/src/*.ts
(sin resultados)
```

**Veredicto:** YA-EXISTE — el campo es interno (usado para validar la salida del handler antes de formatearla) y cero apariciones en el código que arma el payload hacia la API. Confirma que Claude Code sigue el mismo diseño que Codex en este punto.

### 10. Apply Patch (Lark DSL) — NO-APLICA (contrato distinto), principio parcial

> "Apply Patch 定义了一套基于 Lark 语法的 DSL：使用 `*** begin patch`/`*** end patch` 包裹" (`lecture16:184-190`)

```
$ grep -n "old_string\|new_string" src/packages/tool-registry/src/tools/FileEditTool/FileEditTool.ts | head -5
FileEditTool.ts:138:    const { file_path, old_string, new_string, replace_all = false } = input
```

**Veredicto:** NO-APLICA en su forma literal (Codex usa una gramática Lark con marcadores de bloque; Claude Code usa reemplazo por `old_string`/`new_string` único, que ya es el contrato que thyrox reimplementa). El **principio** —forzar diff estructurado en vez de reescritura libre de archivo— ya está cumplido por `FileEditTool`, así que no hay pieza que portar.

### 11. Execute Commands vs Write Stdin — PARCIAL

> "Write Stdin 用于向正在运行的程序持续发送输入 … 与交互式 CLI（如 iPython、Node REPL、MySQL、GDB 等）进行对话" (`lecture16:224-230`)

```
$ find src/packages/tool-registry/src/tools -maxdepth 1 -iname "*bash*"
BashTool
$ rg -n "stdin" src/packages/tool-registry/src/tools/BashTool/*.ts | head
(sin resultados directos de "escribir a un proceso ya corriendo")
```

`BashTool` ejecuta comandos de una vez (con soporte de `run_in_background`), pero no hay un tool separado que escriba a un proceso interactivo ya vivo (tipo REPL) y lea su salida incremental — el propio catálogo de reglas del consumidor (`long-running-commands.md`) resuelve procesos largos con `nohup`+polling de marcador, no con un canal stdin persistente.

**Veredicto:** PARCIAL — lo que existe (`BashTool` + `run_in_background`) cubre el caso "ejecutar y esperar"; el caso "conversar con un REPL abierto" no tiene tool dedicado.

### 12–13. Cinco tools de subagente / notificación automática — PARCIAL / YA-EXISTE

> "Spawn Agents / Send Inputs / Wait / Close Agents / Resume" (`lecture16:236-244`)
> "如果 Master Agent 没有调用 Wait，Subagent 完成后并不会失联。Runtime 会在后台自动将 Subagent 的完成消息以 User 身份注入" (`lecture16:301-303`)

```
$ find src/packages/tool-registry/src/tools/AgentTool -maxdepth 1 -type f
forkSubagent.ts  resumeAgent.ts  runAgent.ts  AgentTool.tsx  ...
$ rg -n "task-notification" src/packages/agent/localAgentTask.tsx src/packages/agent/messageQueueManager.ts
localAgentTask.tsx:351:    mode: 'task-notification',
messageQueueManager.ts:344:  'task-notification',
```

**Veredicto:** spawn (fork), resume y send (`SendMessageTool`) existen; la notificación automática al completar (idea 13) YA-EXISTE y es literalmente el mismo mecanismo que la nota describe para Codex. Lo que falta como *tool explícito* es un `wait`/`close` con timeout configurable — hoy la espera se resuelve con `Monitor`/polling desde el consumidor, no con una llamada de tool que bloquee el turno del agente maestro.

### 14. Spawn sólo con petición explícita o research profundo — PARCIAL

> "只有用户显式要求 Subagent 分派或并发执行时，才创建 Subagent。例外：如果是对 Codebase 做深度、全面的 Research 或系统分析，不需要用户许可即可创建 Subagent" (`lecture16:283-289`)

```
$ sed -n '1,40p' src/hooks/detect_agent_dispatch.py | head -5
```
El quinto detector de `pretooluse_dispatch.py` (documentado en `trabajo-en-segundo-plano.md`) avisa cuando el prompt de un despacho de `Agent` describe una familia determinista sin verbo de juicio — es un criterio distinto (proceso-vs-agente), no "¿el usuario lo pidió explícitamente?".

**Veredicto:** PARCIAL — el criterio de Codex (autorización explícita del usuario, con la excepción de research profundo) no está codificado; el criterio de thyrox (juicio vs determinismo) resuelve un problema adyacente pero no idéntico.

### 15. View Image — NO-APLICA (contrato distinto)

> "GPT 是多模态模型…但在 Agent 系统中，需要一个专门的 Tool… Agent 需要自主决定何时查看哪张图片" (`lecture16:314-318`)

```
$ find src/packages/tool-registry/src/tools -maxdepth 1 -iname "*image*"
(sin resultados)
$ grep -n "This tool allows Claude Code to read images" src/packages/tool-registry/src/tools/FileReadTool/prompt.ts
FileReadTool/prompt.ts:40:- This tool allows Claude Code to read images (eg PNG, JPG, etc)...
```

**Veredicto:** NO-APLICA — es exactamente la divergencia de contrato que la tarea pide vigilar. Codex separa "ver imagen" como Function Call propia porque su runtime no inyecta imágenes salvo bajo demanda explícita; Claude Code (y por tanto thyrox) resuelve la multimodalidad dentro de `Read`, sin tool dedicado. Portar `view_image` duplicaría una capacidad que ya cubre `FileReadTool`.

### 16. Logging de request completo — PARCIAL

> "export CODEX\_LOG\_REQUESTS=1 … 请求体将保存到 ~/.codex/logs-1/skill-lite" (`lecture16:341-345`)

```
$ rg -il "logs-1.sqlite|CODEX_LOG_REQUESTS" src/packages
(sin resultados)
$ sed -n '1,40p' src/packages/provider/src/logging.ts
```
`logging.ts` emite spans/OTel y eventos de analítica, pero no un volcado local, versionable y completo de `instructions`+`input`+`tools` por turno.

**Veredicto:** PARCIAL. Ya existe el precedente exacto en thyrox para *otro* binario: `_references/claude-code-bin/<versión>/claude_strings.txt` (volcado versionado del binario de Claude Code, usado por `redaccion-tecnica-es.md` para medir el vocabulario del cliente). Falta el equivalente para el **tráfico de API en vivo** de la propia reimplementación.

### 17. Plan Mode: no persiste, exploración no destructiva, `request_user_input` sólo ahí — YA-EXISTE con divergencia

> "Plan Mode 结束后形成的是一段 Markdown 文本，但它并不会自动落盘成本地文件。它存在于 context window 中" (`lecture17:106-108`)
> "这个工具只在 Plan Mode 中可用" (`lecture17:104`, sobre `request_user_input`)

```
$ find src/packages/tool-registry/src/tools -maxdepth 1 -iname "*planmode*"
EnterPlanModeTool  ExitPlanModeTool
$ rg -n "planMode|isPlanMode" src/packages/tool-registry/src/tools/AskUserQuestionTool/AskUserQuestionTool.ts
(sin resultados)
```

**Veredicto:** YA-EXISTE la mecánica de Plan Mode (entrar/salir, no persistir a disco por defecto — coincide con la advertencia de la propia nota de que el plan de Codex tampoco es "documento del repo"). **Divergencia de contrato medida:** en Claude Code, `AskUserQuestionTool` (el análogo a `request_user_input`) NO está restringido a Plan Mode — se puede invocar en cualquier turno. Portar la restricción de Codex sería contradecir el binario que se reimplementa; se documenta como divergencia, no como déficit.

### 18–19. `update_plan` minimal + snapshot + un solo `in_progress`; tres capas de planificación — YA-EXISTE / PARCIAL

> `{"explanation": "...", "plan": [{"step": "...", "status": "in_progress"}]}` — "系统约束最多只能有一个 step 处于 in\_progress" (`lecture17:143-146`)
> "Plan Mode / update\_plan / 文件化 todo" — tres capas con roles distintos (`lecture17:186-198`)

```
$ grep -n "Exactly ONE task must be in_progress" src/packages/tool-registry/src/tools/TodoWriteTool/prompt.ts
prompt.ts:173:   - Exactly ONE task must be in_progress at any time (not less, not more)
```

**Veredicto:** idea 18 YA-EXISTE y con la misma semántica exacta (snapshot completo por llamada, no parche por paso — `TodoListSchema` recibe la lista entera). Idea 19 (tres capas) PARCIAL: las dos primeras capas (Plan Mode + TodoWrite) son del harness; la tercera capa (persistencia cross-sesión) el propio diseño de thyrox la delega **al consumidor** (`docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/tareas-<slug>.rst`), que es coherente con la partición proveedor/consumidor de este repo, no un hueco.

### 20. MCP Host→Client→Server→Tool — YA-EXISTE

> "Host：宿主应用…MCP Client：嵌入在 Host 中的库…MCP Server：轻量级的工具包装器" (`week02-notes.tex:172-176`)

```
$ find src/packages -maxdepth 1 -iname "*mcp*"
mcp-runtime
$ find src/packages/mcp-runtime/src -maxdepth 1 -type f | wc -l
```
36 archivos incluyendo `host.ts`, `clientRuntime.ts`, `InProcessTransport.test.ts`, `mcpWebSocketTransport.ts` — cubre stdio (proceso local) y transportes remotos (WS/SSE-equivalentes).

**Veredicto:** YA-EXISTE, más completo que lo descrito en la nota (que es introductoria).

### 21–23. `<system-reminder>` / cuatro técnicas de guía / Hooks — YA-EXISTE

Ya cubierto en 1–2. Para Hooks específicamente:

```
$ rg -l "PreToolUse|PostToolUse|UserPromptSubmit|PreCompact" src/packages --type ts | wc -l
```
≥30 archivos, incluidos `agent/hooks.ts`, `agent/types/hooks.ts`, `agent/compaction/deps.ts` (que declara `PreCompact` como dependencia de tipo).

**Veredicto:** YA-EXISTE — los cuatro eventos que `week04-notes.tex:150-156` lista están todos presentes, y con más granularidad (thyrox además documenta un motor de siete/diez detectores de `PreToolUse` propios en `.claude/rules/`).

### 24–27. Auditar diffs / emparejar modelo-tarea / commits frecuentes / workflows — YA-EXISTE

```
$ find src/packages/tool-registry/src/tools/AgentTool -iname "*attribution*" -o -iname "*color*"
AgentTool/attributionHooks.ts  AgentTool/agentColorManager.ts
```
Y en el consumidor: `model-selection-subagents.md` mide 19 modelos del catálogo real con `advisor_rank`/`effort_cost_index`, muy por encima de la recomendación genérica *"tareas simples: modelo rápido"* de la nota. `docs-design-first-rup.md` ya impone explore→plan→código como secuencia canónica.

**Veredicto:** YA-EXISTE, en varios casos superado por medición propia del proyecto.

### 28–30. Macro actions / protocolo multi-agente / harness en 4 preguntas — PARCIAL / YA-EXISTE

> "不再以'一行代码'…而是以'一个功能模块'…为宏操作单位" (`karpathy-notes.tex:104-107`, trad. de *"It's not just like here's a line of code, it's macro actions."*, `subs.en.srt`)

```
$ grep -n "clase 1\|clase 2\|clase 3" /home/user/kaupamex-docs/.claude/rules/bash-background-tasks.md | head -3
```
(consultado en el consumidor, no en thyrox: la clasificación de trabajo por rutas disjuntas — análisis/código sin dependencia/código con dependencia — es exactamente el criterio de "quién decide la unidad de trabajo y su frontera" que Karpathy describe para Peter Steinberg.)

**Veredicto 28:** PARCIAL — el criterio "ancho y con juicio → agente; conocido y acotado → orquestador" (`model-selection-subagents.md`) captura la idea de unidad de trabajo, pero no hay un valor explícito (p.ej. "≥20 min de trabajo autónomo") como umbral de asignación.
**Veredicto 29:** YA-EXISTE — el aislamiento de working tree por clase (1/2/3) es exactamente "protocolo de fronteras de responsabilidad", no "cuántas ventanas se abren".
**Veredicto 30:** YA-EXISTE como estructura de paquetes (`agent/`, `permission/`, `memory/`), aunque no está formulado como "cuatro preguntas" en ningún archivo — es una propiedad emergente de la partición de paquetes, no un documento.

### 31. `spawn_agents_on_csv` — NO-APLICA (contradice el modelo de costo del proyecto)

> "spawn\_agents\_on\_csv：按 CSV 每行批量启动子代理并汇总结果" (`lecture13:255`)

```
$ find src/session -iname "*pool*"
src/session/run-task-pool.sh  src/session/task_pool.py
```

**Veredicto:** NO-APLICA en su forma literal. `trabajo-en-segundo-plano.md` (regla siempre-cargada de thyrox) declara explícitamente que un subagente por ítem es caro (paga el piso de 126 029 tokens **por turno**, con 98% del consumo en `cache_read`) y que el mecanismo de lote correcto es un **pool de procesos**, no de agentes. Portar `spawn_agents_on_csv` reintroduciría el defecto que esa regla existe para evitar — salvo que cada fila del CSV exija juicio genuino, caso en el que el criterio de despacho ya cubierto (`model-selection-subagents.md`) decide caso por caso.

### 32. Guardas de concurrencia/profundidad al despachar subagentes — AUSENTE-APLICABLE

No es una idea de las notas per se, sino una divergencia medida entre lo que `.claude/rules/bash-background-tasks.md` **documenta como cierto del binario real de Claude Code** (`_references/claude-code-bin`) y lo que el harness reimplementado en `src/` hace hoy:

```
$ rg -rn "MAX_CONCURRENT_SUBAGENTS|Subagent nesting limit|MAX_SUBAGENT_SPAWN_DEPTH" src/packages
(sin resultados)
```

La regla del consumidor cita verbatim del binario real: `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (default 20), el guard de profundidad `MW()` (default 1 — un subagente no puede lanzar subagentes), y que al exceder la anchura el `Agent` tool **rehúsa** (`refused:{depth_limit,concurrency_limit,budget}`, *"Do not retry"*) en vez de encolar. Ninguno de los tres aparece en `src/packages/tool-registry/src/tools/AgentTool/AgentTool.tsx` (1843 líneas, sin ningún hit de `concurrent`/`width`/`limit` relacionado a subagentes).

**Propuesta:** un módulo `src/packages/tool-registry/src/tools/AgentTool/concurrencyGuard.ts` que exponga `checkConcurrencyLimit(activeCount, maxConcurrent)` y `checkSpawnDepth(currentDepth, maxDepth)`, invocado desde `AgentTool.tsx` antes de lanzar el fork, con los defaults medidos (`20` / `1`) parametrizables por `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`/`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`.
**Test que fallaría sin ella:** despachar 21 `Agent()` concurrentes desde el orquestador de una prueba de integración debería devolver 20 aceptados + 1 rechazado con motivo `concurrency_limit` y **sin cola** (ningún efecto de "esperar su turno"); hoy ese test no puede escribirse porque no hay tope que verificar — el harness reimplementado aceptaría los 21.

## Cinco propuestas de mayor valor

1. **Guarda de concurrencia y profundidad de subagentes** (idea 32) — cierra una divergencia MEDIDA entre el contrato del binario real (citado en `.claude/rules/bash-background-tasks.md`) y el harness reimplementado; sin ella, un consumidor que confíe en la regla del rechazo-no-cola se comporta distinto en thyrox que en Claude Code real.
   **Test de aceptación:** lanzar `N = CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS + 1` agentes desde una tanda → exactamente `N-1` corren, el último recibe `refused:{concurrency_limit}` inmediato (no bloqueante); lanzar un `Agent` desde dentro de un subagente con `depth = maxDepth` → rechazo con `depth_limit` y el mensaje *"Complete this task directly"*.

2. **Tool `wait`/`close` explícito para subagentes, con timeout** (ideas 12) — hoy la espera de un subagente vive fuera del contrato de tools (Monitor/polling del consumidor); un tool de primera clase que bloquee el turno del padre hasta el estado terminal (con timeout configurable, ~1h como techo razonable) documentaría el contrato en vez de dejarlo implícito en reglas de consumidor.
   **Test de aceptación:** `wait(agent_id, timeout=60)` sobre un agente que termina a los 5s devuelve su resultado en <6s; sobre uno que no termina, corta a los 60s con un estado `timeout`, no `error`.

3. **Volcado local versionable del payload completo de API** (idea 16) — mismo patrón ya validado en thyrox para el binario de Claude Code (`_references/claude-code-bin/<versión>/claude_strings.txt`), aplicado ahora al tráfico saliente de la propia reimplementación: `instructions`+`input`+`tools` por turno, tras una bandera de entorno explícita.
   **Test de aceptación:** con `THYROX_LOG_REQUESTS=1`, tras un turno con al menos un tool call, existe un archivo con las tres claves (`instructions`, `input`, `tools`) y el tamaño de `tools` coincide con el número de tools registrados en esa sesión.

4. **Criterio explícito de autorización para `spawn` de subagente** (idea 14) — hoy `detect_agent_dispatch.py` mide "juicio vs determinismo" pero no "¿lo pidió el usuario, o es research profundo de codebase?", que es el criterio real que gobierna cuándo el spawn es bienvenido y cuándo es sorpresa cara.
   **Test de aceptación:** un prompt de despacho sin mención de "en paralelo"/"con subagentes" y sin patrón de research amplio (barrido de N archivos/áreas) dispara el aviso del hook; el mismo prompt con "usa subagentes" o con un patrón de barrido de codebase no lo dispara.

5. **Write Stdin — canal a un proceso interactivo vivo** (idea 11) — el hueco es real y no cosmético: hoy no hay forma nativa de conversar con un REPL/CLI interactivo (psql, node, gdb) sin recurrir a heredocs frágiles o matar y relanzar el proceso.
   **Test de aceptación:** lanzar un proceso interactivo en segundo plano, escribirle una línea con el nuevo tool, leer su salida incremental sin cerrar el proceso, y confirmar que una segunda escritura ve el estado acumulado (p. ej. variables definidas en una sesión REPL previa).

---

Métrica: presencia/ausencia de símbolos, archivos y literales citados por `rg`/`find`/`grep -n` sobre `src/packages/**` y `.claude/rules/**` de thyrox, en esta sesión.
Ciega a: comportamiento en tiempo de ejecución (las suites de `src/**/__tests__` no se corrieron para este informe — sólo se midió presencia estática de mecanismo); a divergencias de detalle dentro de un archivo que sí existe pero cuyo contenido no se leyó completo (p. ej. el resto de `AgentTool.tsx` más allá de los `grep` puntuales); y a si las piezas "YA-EXISTE" están cableadas end-to-end en el binario compilado — sólo se verificó que el símbolo/mecanismo está en la fuente TypeScript, no que el build final lo ejercita.

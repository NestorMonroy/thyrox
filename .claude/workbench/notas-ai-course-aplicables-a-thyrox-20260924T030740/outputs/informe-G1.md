# Informe G1 — harness engineering: aplicabilidad a THYROX

Grupo de notas: `anthropic-effective-harnesses`, `anthropic-harness-design` (comparte
fuente con `anthropic-harness-long-running`), `anthropic-harness-long-running`,
`fowler-harness-engineering`, `openai-harness-engineering`, `inngest-agent-harness`,
`humanlayer-skill-issue`, `langchain-improving-deep-agents`.

Nota de procedencia: `anthropic-harness-design/anthropic-harness-design-notes.tex`
(`\newcommand{\videourl}{https://www.anthropic.com/engineering/harness-design-long-running-apps}`)
resultó ser la nota china sobre el **mismo** artículo cuyo texto fuente en inglés
vive en `anthropic-harness-long-running/content.txt`. Se leyó una sola vez y se
citan las dos notas bajo esa fuente compartida.

## 1. Tabla resumen

| # | Idea | Nota de origen | Veredicto | Pieza de thyrox |
|---|---|---|---|---|
| 1 | Evaluador adversarial separado del implementador, escéptico por diseño, que intenta romper el trabajo en vez de confirmarlo | anthropic-harness-long-running | YA-EXISTE | `src/packages/tool-registry/src/tools/AgentTool/built-in/verificationAgent.ts` |
| 2 | E2E como usuario real (browser automation), prohibido declarar éxito por lectura de código | anthropic-effective-harnesses; anthropic-harness-long-running | YA-EXISTE | `verificationAgent.ts` (mismo archivo) |
| 3 | Progressive disclosure de skills/MCP para no saturar el prompt de sistema | humanlayer-skill-issue | YA-EXISTE | `src/packages/agent/skillSearch/` |
| 4 | CLAUDE.md/AGENTS.md corto, curado a mano, tabla de contenidos y no enciclopedia | openai-harness-engineering; humanlayer-skill-issue | YA-EXISTE | `.claude/CLAUDE.md` (116 líneas, cita el piso de 126 000 tokens) |
| 5 | Preferir CLI/Bash sobre herramienta dedicada por eficiencia de contexto | humanlayer-skill-issue | YA-EXISTE | `.claude/rules/operaciones-de-archivo-con-bash.md` + `src/hooks/detect_dedicated_tool_usage.py` |
| 6 | Constricción arquitectónica mecánica (linters/tests estructurales, no sólo el LLM) con mensaje de remediación inyectado al agente | openai-harness-engineering; fowler-harness-engineering | YA-EXISTE | `src/verify/package_boundary.py` + familia `src/hooks/detect_*.py` |
| 7 | Ablación de cada pieza del harness: retirarla y medir qué cae, para saber qué sigue siendo load-bearing | anthropic-harness-long-running | YA-EXISTE | `src/verify/annulment_control.py` + regla `evidencia-antes-de-afirmar.md` |
| 8 | Sub-agente = firewall de contexto; su reporte final es lo único que vuelve, condensado | humanlayer-skill-issue; inngest-agent-harness | YA-EXISTE | `Agent` tool / `SubagentHandback` (contrato de esta misma sesión) |
| 9 | Hook Stop que fuerza al agente a seguir trabajando hasta que una condición se cumpla (Ralph-Wiggum-like) | langchain-improving-deep-agents; humanlayer-skill-issue | YA-EXISTE | `src/packages/agent/goalStopHook.ts` (`/goal`) |
| 10 | Bootstrap de sesión: inspeccionar estado (fase/WP activo) antes de trabajar | anthropic-effective-harnesses | PARCIAL | `src/session/session-start.sh` (sin smoke-test E2E automático) |
| 11 | Reinicio de sesión con relevo estructurado (context reset con handoff), distinto de compactar | anthropic-harness-long-running | PARCIAL | `src/session/session_restart.py` (relevo entre sesiones, no dentro de una) |
| 12 | Umbral de aviso antes de que la compactación fuerce al agente a recortar (evitar "ansiedad de contexto") | inngest-agent-harness | PARCIAL | `src/packages/agent/compaction/autoCompact.ts` (`warningThreshold`/`errorThreshold`) |
| 13 | Backpressure silencioso en éxito, verboso sólo en fallo (evitar inundar el contexto con salida de tests que pasan) | humanlayer-skill-issue | PARCIAL | `src/hooks/stop_tests.py` (informa siempre, no calla en verde) |
| 14 | Planner que expande un prompt corto en spec completa, deliberadamente alto nivel (evita cascada de errores de detalle prematuro) | anthropic-harness-long-running | PARCIAL | fases `discover`/`plan` de THYROX (metodología, no agente separado) |
| 15 | Contrato de "qué es done" negociado ANTES de escribir código, vía archivos | anthropic-harness-long-running | PARCIAL | skill `spec-driven` (Given/When/Then + DbC) — no es negociación generador↔evaluador vía archivo |
| 16 | Costo de un subagente rastreado por modelo/tarea | inngest-agent-harness (cost control) | YA-EXISTE | `src/agents/agent-cost.sh`, `src/agents/model_catalog.py` |
| 17 | Iniciador/programador de ejecución independiente de cómo se disparó (webhook, cron, sub-agente) | inngest-agent-harness | AUSENTE-APLICABLE | ningún trigger unificado en `src/session/`; hoy cada mecanismo (`bg.sh`, `wait-jobs.sh`) es su propio disparador |
| 18 | Cada llamada a LLM/herramienta es un "step" independientemente reintentable (durabilidad a grano fino) | inngest-agent-harness | PARCIAL | `src/session/job_ledger.py` es durable a nivel de TRABAJO, no de cada tool-call |
| 19 | Lista de features JSON con `passes: false/true`, instrucción explícita de no tocar el archivo salvo el campo de estado | anthropic-effective-harnesses | AUSENTE-APLICABLE | sin equivalente |
| 20 | Archivo de progreso legible por la siguiente sesión, escrito al cierre de cada una | anthropic-effective-harnesses | PARCIAL | `.claude/workbench/*` + tareas `TASK-THYROX-NNNN`, pero no un único archivo de "qué pasó" leído al abrir sesión |
| 21 | Concurrencia singleton por sesión: cancelar+reiniciar el loop si llega un mensaje nuevo mientras corre | inngest-agent-harness | AUSENTE-APLICABLE | sin equivalente |
| 22 | Poda de contexto en dos niveles: soft-trim (cabeza+cola) de resultados viejos de herramienta, hard-clear al superar umbral, distinto de la compactación | inngest-agent-harness | AUSENTE-APLICABLE | sólo existe compactación a nivel de sesión, no poda por resultado de herramienta |
| 23 | Detección de "doom loop": contar ediciones al mismo archivo y avisar tras N | langchain-improving-deep-agents | AUSENTE-APLICABLE | sin equivalente |
| 24 | "Sandwich" de esfuerzo de razonamiento: más cómputo en planificación/verificación, menos en el tramo medio de implementación | langchain-improving-deep-agents | AUSENTE-APLICABLE | `effort.tsx` es un comando manual, no una política automática por fase |
| 25 | Skill de análisis de trazas: buscar trazas → agentes paralelos de análisis de error → síntesis → cambios al harness, con revisión humana para evitar sobreajuste a una sola tarea | langchain-improving-deep-agents | AUSENTE-APLICABLE | sin equivalente |
| 26 | Cada regla/gate nace por un episodio real registrado ("cuando el agente falla, se ingeniería una solución para que no vuelva a fallar así") | humanlayer-skill-issue | YA-EXISTE (más desarrollado que la fuente) | `.claude/rules/memoria-episodica-fallos.md`, `gitlink-bump-gate.md` ("la lección escrita no previene la reincidencia — sólo un gate ejecutable lo hace") |
| 27 | "Golden principles": agentes de limpieza periódicos que detectan desviación y abren PRs de refactor automerge-ables | openai-harness-engineering | AUSENTE-APLICABLE | hay gates que DETECTAN deuda (`check_rule_divergence.py`, `check_stale_divergence.py`); no hay agente programado que la corrija y abra PR |
| 28 | Ambiente de observabilidad efímero por worktree, consultable por el agente (logs/métricas) | openai-harness-engineering | NO-APLICA | thyrox no ejecuta la aplicación del consumidor; no hay runtime propio que observar |
| 29 | Fusionar rápido con gates mínimos; los flakes se reintentan, no bloquean (alto throughput) | openai-harness-engineering | NO-APLICA | contradice el perfil `estricto` por defecto de `.claude/rules/perfil-de-rigor-de-cierre.md`; el `exploratorio` ya cubre el caso de menor rigor declarado |
| 30 | Preferir dependencias "aburridas"/reimplementar un subconjunto propio en vez de una librería opaca | openai-harness-engineering | NO-APLICA | decisión de producto de aplicación consumidora, no de thyrox como proveedor de metodología |
| 31 | Harness/juicio requiere re-calibración por modelo, no se traslada ciegamente de un modelo a otro | langchain-improving-deep-agents; humanlayer-skill-issue (Terminal Bench #33→#5) | PARCIAL | `model_catalog.py` ya modela costo/efecto por modelo; no hay recalibración automática de prompts de agente por familia |
| 32 | Envolver un MCP de terceros en una CLI propia, delgada, con ejemplos documentados, para ahorrar tokens de definición de herramienta | humanlayer-skill-issue | AUSENTE-APLICABLE | sin equivalente (los `bin/` de thyrox envuelven mecanismos PROPIOS, no MCPs ajenos) |
| 33 | Sub-agentes por rol ("frontend engineer") no funcionan; sub-agentes por tarea (control de contexto) sí | humanlayer-skill-issue | YA-EXISTE (como criterio ya aplicado) | `.claude/rules/trabajo-en-segundo-plano.md` — despacha por tarea determinista, no por rol de dominio |

## 2. Detalle por idea

### 1 — Evaluador adversarial separado, escéptico por diseño

Fuente (`anthropic-harness-long-running/content.txt:25`):
> "Separating the agent doing the work from the agent judging it proves to be a strong lever to address this issue. [...] tuning a standalone evaluator to be skeptical turns out to be far more tractable than making a generator critical of its own work."

Medición en thyrox:
```
$ grep -n "verification specialist\|break it" src/packages/tool-registry/src/tools/AgentTool/built-in/verificationAgent.ts | head -3
10:const VERIFICATION_SYSTEM_PROMPT = `You are a verification specialist. Your job is not to confirm the implementation works — it's to try to break it.
```
Veredicto: **YA-EXISTE**. `verificationAgent.ts` implementa exactamente el mismo principio — separación implementador/verificador, el segundo con instrucción explícita de escepticismo ("verification avoidance", "seduced by the first 80%", lista de racionalizaciones a reconocer y rechazar).

### 2 — E2E como usuario real, prohibido declarar éxito por lectura de código

Fuente (`anthropic-effective-harnesses/content.txt:66`):
> "Absent explicit prompting, Claude tended to make code changes, and even do testing with unit tests or curl commands against a development server, but would fail recognize that the feature didn't work end-to-end."

Medición: el mismo `verificationAgent.ts` línea "Test suite results are context, not evidence. Run the suite, note pass/fail, then move on to your real verification." y la sección `=== ADVERSARIAL PROBES ===`.
Veredicto: **YA-EXISTE**, y con más rigor que la fuente (además exige sondas adversariales de concurrencia/idempotencia/borde, no sólo "usarlo como humano").

### 3 — Progressive disclosure de skills/MCP

Fuente (`humanlayer-skill-issue/content.txt:135-139`):
> "We kept stuffing every instruction and tool into the system prompt, and the agent kept getting worse. [...] Skills solve this through progressive disclosure."

Comando: `find src/packages/agent/skillSearch -maxdepth 1` → `prefetch.ts`, `signals.ts`, `remoteSkillLoader.ts`, `localSearch.ts`, `remoteSkillState.ts`, `telemetry.ts`.
Veredicto: **YA-EXISTE** — el mecanismo entero de búsqueda diferida de skills es exactamente esto.

### 4 — CLAUDE.md corto, curado a mano, no generado

Fuente (`humanlayer-skill-issue/content.txt:79-91`, resumiendo el estudio ETH Zurich):
> "LLM-generated ones actually hurt performance while costing 20%+ more [...] Our CLAUDE.md is under 60 lines."

Medición:
```
$ wc -l /home/user/thyrox/.claude/CLAUDE.md
116 .claude/CLAUDE.md
$ grep -n "126" .claude/CLAUDE.md
25:con `paths:`**, o sea ~126 000 tokens de piso que **cada subagente vuelve a
```
Veredicto: **YA-EXISTE**. `.claude/CLAUDE.md` cita textualmente el mismo fenómeno que el estudio (el piso de contexto), y su propia sección "Por qué este archivo es corto" es la aplicación consciente del mismo principio.

### 5 — CLI/Bash preferido sobre herramienta dedicada

Fuente (`humanlayer-skill-issue/content.txt:111`):
> "if an MCP server duplicates functionality that's already available as a CLI well-represented in training data, it works better to just prompt the agent to use the CLI [...] composability with tools like grep and jq".

Medición:
```
$ grep -n "sexto detector" .claude/rules/operaciones-de-archivo-con-bash.md
```
Veredicto: **YA-EXISTE** — con motivación distinta (costo en tokens medido, no sólo composabilidad), pero el mismo mecanismo: `src/hooks/detect_dedicated_tool_usage.py` avisa cuando se usa `Read`/`Edit`/`Write` donde Bash bastaría.

### 6 — Constricción arquitectónica mecánica con remediación inyectada

Fuente (`openai-harness-engineering/content.txt:126,132`):
> "These constraints are enforced mechanically via custom linters [...] and structural tests. [...] we write the error messages to inject remediation instructions into agent context."

Medición:
```
$ sed -n '1,13p' src/verify/package_boundary.py
"""Un paquete se entra por su ``exports``, nunca por el ``src/`` del vecino. [...]"""
```
Veredicto: **YA-EXISTE**. `package_boundary.py` (fronteras de dependencia) + la familia `src/hooks/detect_*.py` (que inyectan `additionalContext` con la corrección exacta) son el mismo patrón. thyrox lo generaliza a 10+ detectores.

### 7 — Ablación de cada pieza del harness (load-bearing test)

Fuente (`anthropic-harness-long-running/content.txt:121`):
> "every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing [...] removing one component at a time and reviewing what impact it had."

Medición:
```
$ sed -n '1,20p' src/verify/annulment_control.py
"""Ejecuta un control de anulación y deja su evidencia en el banco. Un control de anulación retira la causa de un arreglo y comprueba que caen EXACTAMENTE las aserciones que dependen de ella."""
```
Veredicto: **YA-EXISTE**, y es un principio transversal citado en casi todas las reglas de `.claude/rules/` de thyrox (control de anulación), no sólo un script aislado.

### 8 — Sub-agente como firewall de contexto, reporte condensado

Fuente (`humanlayer-skill-issue/content.txt:164`; `inngest-agent-harness/content.txt:163`):
> "the dispatching agent only sees the prompt it writes for the sub-agent, and the sub-agent's final result."
> "The sub-agent gets its own retries [...] The parent agent just sees a tool result: 'here's what I did.'"

Medición: el propio contrato de esta sesión (`SubagentHandback`) y `src/verify/check_agent_isolation.py`.
Veredicto: **YA-EXISTE** — es la arquitectura nativa del cliente que thyrox reimplementa (`src/packages/tool-registry/src/tools/AgentTool/`), y thyrox añade un gate que verifica coherencia entre lo declarado (`isolation: worktree`) y lo anunciado.

### 9 — Stop hook que fuerza continuación hasta cumplir condición

Fuente (`langchain-improving-deep-agents/content.txt:58`):
> "a PreCompletionChecklistMiddleware that intercepts the agent before it exits [...] This is similar to a Ralph Wiggum Loop where a hook forces the agent to continue executing on exit."

Medición:
```
$ sed -n '1,20p' src/packages/agent/goalStopHook.ts
/** Ciclo de vida del Stop hook de `/goal` [...] */
```
Veredicto: **YA-EXISTE** — `/goal` es exactamente ese mecanismo (Stop hook que bloquea el cierre del turno mientras la condición declarada no se cumpla), heredado del binario nativo y portado con test de paridad.

### 10 — Bootstrap de sesión (getting up to speed)

Fuente (`anthropic-effective-harnesses/content.txt:74-82`):
> "Run pwd [...] Read the git logs and progress files [...] Read the features list file [...] run through a basic end-to-end test before implementing a new feature."

Medición: `src/session/session-start.sh` resuelve WP/fase activa y expone comandos `/thyrox:*` — pero no ejecuta un smoke-test automático de la aplicación antes de trabajar (no aplica igual, thyrox no tiene "la aplicación" que levantar — construye metodología, no un producto con servidor propio).
Veredicto: **PARCIAL**. Falta el equivalente de "reproducir el smoke-test antes de tocar nada" — que en thyrox correspondería a correr `tests/run.sh` al arrancar, lo cual SÍ existe como regla (`alcance-de-la-suite.md`: "`bash tests/run.sh` corre al arrancar la sesión") aunque no está automatizado como hook, sino como instrucción de prosa.

### 11 — Reinicio de sesión con relevo estructurado (context reset)

Fuente (`anthropic-harness-long-running/content.txt:19`):
> "Context resets — clearing the context window entirely and starting a fresh agent, combined with a structured handoff that carries the previous agent's state [...] This differs from compaction."

Medición:
```
$ sed -n '1,15p' src/session/session_restart.py
"""Prepara el RELEVO de sesion [...] Lo que SI puede es preparar el relevo — una sesion NUEVA en el mismo entorno, sobre el mismo repo y rama, que si lee la configuracion al arrancar."""
```
Veredicto: **PARCIAL**. `session_restart.py` resuelve el mismo problema (relevo con parámetros derivados, no adivinados) pero para un caso distinto (recarga de configuración tras mover `settings.json`), no como estrategia general contra "ansiedad de contexto" dentro de una tarea larga.

### 12 — Umbral de aviso antes del recorte forzado (context anxiety)

Fuente (`inngest-agent-harness/content.txt:209`):
> "budget warnings — system messages injected when the agent is running low on iterations, telling it to wrap up."

Medición:
```
$ grep -n "warningThreshold\|errorThreshold" src/packages/agent/compaction/autoCompact.ts
142:  const warningThreshold = threshold - WARNING_THRESHOLD_BUFFER_TOKENS
143:  const errorThreshold = threshold - ERROR_THRESHOLD_BUFFER_TOKENS
```
Veredicto: **PARCIAL** — existe el umbral de aviso a nivel de tokens (compactación automática), no un aviso textual "te quedan N iteraciones, cierra" inyectado como mensaje al modelo.

### 13 — Backpressure silencioso en éxito

Fuente (`humanlayer-skill-issue/content.txt:289-291`):
> "early on we had our agent run the full test suite after every change, and 4,000 lines of passing tests would flood the context window [...] Now we swallow the output and only surface errors."

Medición:
```
$ sed -n '176,178p' src/hooks/stop_tests.py
    if done.returncode == 0:
        ...
        return 0, f"Pruebas de {watched.name}: {last}\n"
```
Veredicto: **PARCIAL** — `stop_tests.py` sí evita el volcado completo (reporta sólo la última línea), pero reporta SIEMPRE, no calla del todo en verde como pide la fuente.

### 14 y 15 — Planner que expande el prompt / contrato de "done" pre-código

Fuente (`anthropic-harness-long-running/content.txt:76,88-90`):
> "a planner agent that took a simple 1-4 sentence prompt and expanded it into a full product spec [...] Before each sprint, the generator and evaluator negotiated a sprint contract."

Medición: `src/session/session-start.sh` mapea Stage/Phase a `/thyrox:discover`…`/thyrox:decompose`; el skill `spec-driven` en la lista de skills disponibles cubre Given/When/Then + contratos DbC.
Veredicto: **PARCIAL** en ambos — el ESPÍRITU (expandir antes de construir, acordar el criterio de "hecho" antes de escribir código) es la columna vertebral del ciclo de 12 fases de THYROX, pero no hay un agente "planner" y un agente "evaluator" negociando un contrato vía archivo — es una metodología de una sesión, no una arquitectura de dos agentes.

### 16 — Costo por subagente

Fuente (`inngest-agent-harness/content.txt:206-208`, sobre modelos distintos por costo):
> "We use an expensive model (Opus) for the parent session [...] and a cheaper, faster model like Sonnet or Haiku for each sub-agent."

Medición: `src/agents/agent-cost.sh`, `src/agents/model_catalog.py`.
Veredicto: **YA-EXISTE**, y más desarrollado — thyrox modela precio por tier, TTL de caché, `effort_cost_index` por familia de modelo (documentado extensamente en `model-selection-subagents.md` del lado consumidor).

### 17 — Disparador desacoplado del loop (universally triggered)

Fuente (`inngest-agent-harness/content.txt:15`):
> "The trigger is decoupled from the work [...] The harness routes it."

Medición:
```
$ rg -il "webhook.*trigger|scheduler" src/session
(sin resultados)
```
Veredicto: **AUSENTE-APLICABLE**. Hoy `bg.sh`/`wait-jobs.sh`/`run-task-pool.sh` son tres mecanismos de despacho, cada uno invocado explícitamente; no hay una capa que reciba un evento (webhook, cron, mensaje de otro subagente) y lo enrute de forma uniforme al mismo bucle. Nota: el propio harness de Claude Code sí ofrece Routines/triggers a nivel de producto (fuera de `src/thyrox`), así que la pieza que faltaría en thyrox es documentar/envolver ese enrutamiento como parte del contrato de sesión, no reinventarlo.
Propuesta: un módulo `src/session/trigger_router.py` que normalice el origen (`SessionStart`, `Routine`, `wake reason=external-event`, invocación manual) a un único payload antes de entrar al loop de sesión, con test: dado un evento sintético de cada origen, el router produce el mismo esquema de entrada — fallaría hoy porque cada consumidor de `session-start.sh` lee variables de entorno distintas según quién lo invocó.

### 18 — Step-level durable execution

Fuente (`inngest-agent-harness/content.txt:9,86`):
> "Every LLM call or tool call becomes a step — an independently retryable unit of work. If the process dies on iteration five, iterations one through four are already persisted."

Medición: `src/session/job_ledger.py` registra trabajos completos (`Job`) con `register`/`settle`/`wait` — la unidad es el TRABAJO en segundo plano, no la llamada individual a LLM/herramienta dentro de una sesión interactiva.
Veredicto: **PARCIAL**. thyrox reintenta y recupera a nivel de proceso en segundo plano (H-THYROX-07/marker_wait), pero no persiste cada tool-call individual como unidad reintentable — coherente con que thyrox no reemplaza el bucle del cliente, sólo lo instrumenta desde fuera.

### 19 — Lista de features JSON con `passes: false/true`

Fuente (`anthropic-effective-harnesses/content.txt:41-54`):
> `"passes": false` [...] "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality."

Medición:
```
$ rg -il "feature_list|feature-list" src .claude/rules
(sin resultados relevantes; los hits de "passes" eran falsos positivos de "password"/"passes por")
```
Veredicto: **AUSENTE-APLICABLE**. thyrox tiene TDD con "mitad roja persistida" (aserciones rojas registradas y su control de anulación), que cubre parcialmente el espíritu (persistir qué falta como estado explícito, no borrarlo), pero no hay un manifiesto único de features end-to-end con estado booleano por feature que el agente no pueda reescribir libremente.
Propuesta: ver sección 3.

### 20 — Archivo de progreso único leído al abrir sesión

Fuente (`anthropic-effective-harnesses/content.txt:31`):
> "The key insight here was finding a way for agents to quickly understand the state of work when starting with a fresh context window [...] accomplished with the claude-progress.txt file alongside the git history."

Medición: `.claude/workbench/<slug>-<timestamp>/` (bancos por episodio) + `src/task/task_ids.py` (tablero de tareas citables) — cumplen la función de estado persistente entre sesiones, pero de forma distribuida (un directorio por episodio), no como un único archivo append-only que la siguiente sesión lea primero.
Veredicto: **PARCIAL**.

### 21 — Concurrencia singleton (cancelar+reiniciar ante mensaje nuevo)

Fuente (`inngest-agent-harness/content.txt:167-185`):
> "singleton: { key: 'event.data.sessionKey', mode: 'cancel' }"

Medición:
```
$ rg -il "singleton" src/session src/packages/agent
(sin resultados relevantes al patrón)
```
Veredicto: **AUSENTE-APLICABLE**. thyrox no gestiona conversaciones concurrentes por canal (Telegram/Slack); no aplica al caso de uso actual de una sesión interactiva de Claude Code, pero SÍ aplicaría si thyrox alguna vez expone un daemon (`src/packages/daemon` existe) que reciba eventos externos concurrentes para la misma sesión — condición de cierre: cuando `daemon` acepte más de un canal de entrada por sesión.

### 22 — Poda de contexto en dos niveles (soft-trim / hard-clear), separada de compactación

Fuente (`inngest-agent-harness/content.txt:195-207`):
> "Old tool results get soft-trimmed (keep head + tail) or hard-cleared entirely when total context gets large [...] Pruning handles within-run context. Compaction handles across-run accumulation."

Medición:
```
$ rg -il "soft.?trim|hard.?clear" src/packages/agent
(sin resultados)
```
Veredicto: **AUSENTE-APLICABLE**. thyrox porta la compactación nativa del cliente (`src/packages/agent/compaction/`) pero no añade una capa PROPIA de poda de resultados de herramienta anterior a la compactación.
Propuesta: ver sección 3.

### 23 — Detección de doom-loop por conteo de ediciones al mismo archivo

Fuente (`langchain-improving-deep-agents/content.txt:76-80`):
> "a LoopDetectionMiddleware that tracks per-file edit counts via tool call hooks. It adds context like '...consider reconsidering your approach' after N edits to the same file."

Medición:
```
$ rg -in "edit.?count|repeated edit" src --type ts --type py
(sin resultados relevantes — sólo un comentario sobre "code-edit counter" en telemetría OTel, no un detector)
```
Veredicto: **AUSENTE-APLICABLE**. thyrox tiene diez detectores de `PreToolUse` (comando largo, recorrido sin cota, cita efímera, etc.) pero ninguno mide repetición de edición sobre el MISMO archivo dentro del turno.
Propuesta: ver sección 3 (es una de las 5 finales).

### 24 — "Sandwich" de esfuerzo de razonamiento por fase

Fuente (`langchain-improving-deep-agents/content.txt:90-94`):
> "we choose a xhigh-high-xhigh 'reasoning sandwich' as a baseline [...] Running only at xhigh scored poorly [...] due to agent timeouts compared to 63.6% at high."

Medición: `src/packages/command-runtime/src/commands/effort/effort.tsx` es un comando manual (`/effort`), no una política automática que suba el nivel en planificación/verificación y lo baje en el tramo medio.
Veredicto: **AUSENTE-APLICABLE** (como automatismo); el conocimiento de que el costo de esfuerzo varía por familia de modelo SÍ está modelado (`model_catalog.py`, `effort_cost_index`), pero encadenarlo a una política "sandwich" por fase de una tarea no existe.

### 25 — Skill de análisis de trazas (Trace Analyzer)

Fuente (`langchain-improving-deep-agents/content.txt:27-37`):
> "Fetch experiment traces from LangSmith. Spawn parallel error analysis agents → main agent synthesizes findings + suggestions. Aggregate feedback and make targeted changes to the harness [...] A human can be pretty helpful in Step 3 [...] to verify and discuss proposed changes."

Medición:
```
$ rg -il "trace.?analy" src .claude/rules
(sin resultados)
```
Veredicto: **AUSENTE-APLICABLE**. thyrox tiene mucha infraestructura de medición retrospectiva (censo de hallazgos, `agent_store.py`, telemetría de costo) pero no un flujo que, a partir de N sesiones fallidas, despache agentes paralelos de análisis de error y sintetice cambios de harness propuestos.
Propuesta: ver sección 3 (candidata principal).

### 26 — "Cuando el agente falla, se ingeniería una solución para que no vuelva a fallar así"

Fuente (`humanlayer-skill-issue/content.txt:26`):
> "harness engineering [...] is the idea that anytime you find an agent makes a mistake, you take the time to engineer a solution such that the agent never makes that mistake again." (cita a Mitchell Hashimoto)

Medición:
```
$ grep -n "La lección escrita no previene" .claude/rules/git.md .claude/rules/*.md 2>/dev/null | head -3
```
(la cita exacta vive en las reglas consumidoras de kaupamex, pero el mecanismo — hooks generados a partir de un episodio real — es de thyrox: `src/hooks/*.py`, cada uno con su episodio de origen documentado en el docstring).
Veredicto: **YA-EXISTE**, y es EL principio organizador de todo `src/hooks/` y `src/verify/`: cada detector nace de un episodio (`H-THYROX-*`) y queda con su control de anulación. thyrox no sólo aplica la idea — la institucionalizó con más rigor que la fuente (exige medir qué cae al anular, no basta con "escribir la regla").

### 27 — Agentes de garbage collection periódicos con PRs automerge-ables

Fuente (`openai-harness-engineering/content.txt:193`):
> "we have a set of background Codex tasks that scan for deviations, update quality grades, and open targeted refactoring pull requests. Most of these can be reviewed in under a minute and automerged."

Medición: `check_rule_divergence.py` y `check_stale_divergence.py` DETECTAN deuda (reglas divergentes entre consumidores, comentarios de divergencia caducados) pero no hay un trabajo programado que abra el PR de corrección automáticamente.
Veredicto: **AUSENTE-APLICABLE**. La infraestructura de disparo programado existe fuera de `src/` (Routines del cliente), así que la pieza que falta es el AGENTE de limpieza en sí, no el disparador.
Propuesta: ver sección 3.

### 28 — Observabilidad efímera por worktree

Fuente (`openai-harness-engineering/content.txt:46`):
> "Logs, metrics, and traces are exposed to Codex via a local observability stack that's ephemeral for any given worktree [...] Agents can query logs with LogQL and metrics with PromQL."

Veredicto: **NO-APLICA**. thyrox es proveedor de metodología y harness — no ejecuta una aplicación de producto propia con logs/métricas de negocio que observar; `src/packages/local-observability` mide EL PROPIO harness (telemetría de sesión), no un servicio corriendo. La idea es válida para un consumidor (kaupamex-api/ui) que sí tiene servidor, pero no para thyrox mismo.

### 29 — Merge rápido, flakes se reintentan, throughput sobre bloqueo

Fuente (`openai-harness-engineering/content.txt:146`):
> "In a system where agent throughput far exceeds human attention, corrections are cheap, and waiting is expensive [...] This would be irresponsible in a low-throughput environment."

Veredicto: **NO-APLICA**. Contradice explícitamente el default de thyrox: `.claude/rules/perfil-de-rigor-de-cierre.md` fija `estricto` como default (piso de evidencia y completitud caro en tokens) precisamente porque un consumidor puede no tener la referencia externa que justifica relajar el rigor. El propio artículo declara la condición que hace válida su elección — alto throughput con corrección barata — y esa condición es la que el perfil `exploratorio` ya captura como declaración EXPLÍCITA del consumidor, no un default.

### 30 — Preferir dependencias "aburridas" / reimplementar subconjunto propio

Fuente (`openai-harness-engineering/content.txt:118`):
> "rather than pulling in a generic p-limit-style package, we implemented our own map-with-concurrency helper."

Veredicto: **NO-APLICA** para thyrox como proveedor — es una decisión de arquitectura de producto de un consumidor construyendo SU aplicación, no una decisión de metodología/tooling que thyrox entregue. (Podría ser aplicable dentro de `src/packages/*` en casos puntuales, pero no hay una idea metodológica generalizable distinta de "no dependas de librerías opacas", que ya no es una decisión mecanizable ni gobernable con un gate.)

### 31 — Recalibrar el harness por modelo, no trasladarlo ciegamente

Fuente (`humanlayer-skill-issue/content.txt:61`):
> "Terminal Bench 2.0 where Opus 4.6 in Claude Code comes in position #33, but when placed in a different harness that wasn't seen during post-training, it comes in at #5."

Medición: `model_catalog.py` modela `effort_cost_index`, `advisor_rank`, ventana y precio POR MODELO — es la base de datos necesaria, pero no hay un mecanismo que, ante un cambio de modelo default, dispare una re-medición de qué piezas del harness siguen siendo load-bearing.
Veredicto: **PARCIAL** — el dato está, el ciclo de recalibración automática no.

### 32 — Envolver un MCP de terceros en una CLI propia de bajo costo

Fuente (`humanlayer-skill-issue/content.txt:115-127`, el caso Linear):
> "we wrote a small CLI that wraps the Linear API and provides very context-efficient responses [...] This saved us thousands of tokens."

Medición: `bin/` de thyrox envuelve mecanismos PROPIOS (`bg.sh`, `wait-jobs.sh`) con el mismo objetivo de eficiencia, pero no hay un patrón documentado para el caso de un MCP EXTERNO (GitHub, Docs) que se use con suficiente frecuencia como para justificar una CLI de reemplazo.
Veredicto: **AUSENTE-APLICABLE** — de valor más bajo que los otros (depende de qué MCPs use cada consumidor; no es genérico).

### 33 — Sub-agentes por tarea, no por rol de dominio

Fuente (`humanlayer-skill-issue/content.txt:162`):
> "We tried the 'frontend engineer' sub-agent and 'backend engineer' sub-agent and 'data analyst' sub-agent thing. It doesn't work. What does work is using sub-agents for context control."

Medición: `.claude/rules/trabajo-en-segundo-plano.md` — "El agente rinde cuando el trabajo es ancho y exige juicio [...] Una suite, un gate, un censo, un barrido determinista [...] cualquier cosa cuyo resultado no dependa de decidir nada es un proceso" — despacha por FORMA DE TRABAJO, nunca por rol de dominio ("agente de frontend").
Veredicto: **YA-EXISTE** como criterio activo, con el mismo diagnóstico que la fuente (aunque llegado por otra medición: costo en tokens, no calidad del resultado).

## 3. Las 5 propuestas de mayor valor, ordenadas

1. **Skill/agente de análisis de trazas con síntesis de cambios de harness** (idea 25, `langchain-improving-deep-agents`). Un mecanismo que tome N episodios recientes de `.claude/workbench/` + hallazgos `H-THYROX-*` no cerrados, despache agentes paralelos de "¿qué falló y por qué?" sobre cada uno, y proponga (no aplique solo) un cambio concreto a un detector o regla, con revisión humana antes de aplicar.
   *Test de aceptación:* dado un directorio sintético con 3 episodios cuyo denominador común es "el agente citó `#N` en vez de `TASK-THYROX-NNNN`", el skill produce una propuesta que señala exactamente ese patrón y cita los tres episodios — falla hoy porque no existe ningún comando que agregue episodios de `.claude/workbench/` y proponga un detector nuevo; la única vía es manual.

2. **Detector de doom-loop por conteo de ediciones al mismo archivo en el turno** (idea 23, `langchain-improving-deep-agents`). Nuevo `src/hooks/detect_repeated_edit.py`, undécimo detector de `pretooluse_dispatch.py`: cuenta ediciones (`Edit`/`Write`) al mismo `file_path` dentro del turno y avisa (no bloquea, mismo criterio que sus diez hermanos) a partir de N ≥ 4.
   *Test de aceptación:* `tests/hooks/test_detect_repeated_edit.py` — una secuencia sintética de 5 `Edit` sobre el mismo archivo dispara el aviso en la 4ª; la misma secuencia sobre 5 archivos distintos no dispara ninguna. Sin el detector, ambos casos son indistinguibles hoy (ningún hook mide "el mismo" file_path repetido).

3. **Lista de features/criterios de aceptación con estado booleano que el agente no puede reescribir libremente** (idea 19, `anthropic-effective-harnesses`), adaptada al vocabulario de thyrox: extender `src/task/task_ids.py` con un archivo `criterios-aceptacion-<slug>.json` por tarea, donde cada entrada tenga `{descripcion, passes: false}` y sólo el campo `passes` sea editable — el resto lo protege un gate (`src/verify/check_acceptance_criteria_immutable.py`) que compara el hash del resto de campos contra un baseline.
   *Test de aceptación:* un intento de modificar `descripcion` en el JSON (dejando `passes` intacto) hace fallar el gate con un diff exacto del campo tocado; modificar sólo `passes` pasa. Hoy no hay nada que lo mida — cualquier cambio al archivo de criterios pasa silenciosamente.

4. **Poda de resultados de herramienta en dos niveles, separada de la compactación** (idea 22, `inngest-agent-harness`): un módulo `src/packages/agent/compaction/toolResultPrune.ts` que, ANTES de que la compactación entre en juego, recorte resultados de herramienta viejos (cabeza+cola, umbral configurable) manteniendo intactos los últimos N turnos.
   *Test de aceptación:* con un `messages[]` sintético de 20 resultados de herramienta de 5000 caracteres cada uno, tras podar quedan los últimos 3 intactos y los 17 anteriores recortados a `headChars+tailChars`; sin el módulo, la única poda disponible es la compactación completa de la sesión (mucho más cara y menos granular) — medible comparando tokens antes/después con y sin el módulo.

5. **Agente de limpieza programado (garbage collection) sobre la deuda que los gates YA detectan** (idea 27, `openai-harness-engineering`): conectar `check_rule_divergence.py` y `check_stale_divergence.py` a una Routine programada que, al detectar una nueva divergencia o una ausencia declarada caducada, despache un agente acotado (no de juicio — determinista, por la propia clasificación de `trabajo-en-segundo-plano.md`) que proponga el parche mínimo y lo deje listo para revisión humana en un PR, en vez de quedar como reporte que nadie vuelve a mirar.
   *Test de aceptación:* con una regla duplicada sintética en dos "consumidores" de prueba cuyo contenido diverge, la Routine dispara, el agente produce un diff que sincroniza el consumidor atrasado con el canónico, y el PR resultante pasa `check_rule_divergence.py` en verde. Hoy el gate reporta el problema en cada sesión (`coherence-audit-gate.md`) pero nadie lo cierra si no hay un humano que decida hacerlo ese día.

## 4. Métrica y ceguera

**Métrica:** se leyeron completos (con `cat -n`/`sed -n`) los 7 archivos de fuente en inglés (`content.txt`, 5 con fuente propia + 1 compartida entre `anthropic-harness-design` y `anthropic-harness-long-running`) y `anthropic-effective-harnesses` que no tiene nota china separada de otro artículo; se verificaron los encabezados del `.tex` sin fuente (`anthropic-harness-design`) para confirmar que su `\videourl` coincide con la fuente ya leída. Cada idea sustantiva se contrastó contra thyrox con `rg`/`find`/`sed -n`/`grep -n` real sobre `/home/user/thyrox/src` y `/home/user/thyrox/.claude/rules`, citando comando y salida (resumida) junto al veredicto.

**Ciega a:** (1) no se leyó línea por línea el `.tex` de `anthropic-harness-design` más allá de su índice de secciones y cabecera — al compartir fuente con `anthropic-harness-long-running`, se asumió que no aporta contenido nuevo que el `content.txt` inglés no tenga; si la nota china reformula con matices propios del traductor, esos matices no se auditaron. (2) Las búsquedas en thyrox son por palabra clave (`rg`/`grep`); un mecanismo que implemente la misma idea con vocabulario totalmente distinto al usado aquí puede haber quedado sin encontrar — el riesgo es mayor en los veredictos `AUSENTE-APLICABLE`, que son negativos y dependen de la cobertura léxica de la búsqueda. (3) No se ejecutó ningún test ni se corrió la suite de thyrox — el informe es de lectura y grep, no de verificación funcional de las piezas citadas como `YA-EXISTE`. (4) No se leyeron los `.tex` completos de las notas con fuente en inglés más allá de su índice de secciones (se confió en que la fuente en inglés, más autorizada y completa, cubre el contenido).

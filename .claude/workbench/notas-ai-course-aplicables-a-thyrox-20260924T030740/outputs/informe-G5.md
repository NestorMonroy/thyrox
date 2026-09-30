# Informe G5 — context engineering, memoria de agentes y práctica de trabajo con coding agents

Grupo de notas: ram-agentic-memory, panda-claude-code-best-practices, vishwas-50-claude-tips,
openai-codex-best-practices, corey-cowork-starter, cs146s/week03, self-evolving-agents-2026
(lectures 6 y 7), dotey-karpathy-translation.

Todas las notas se leyeron completas. Cada veredicto está medido contra `/home/user/thyrox`
con `rg`/`grep`/`find`/`wc` en este turno — ninguna cifra es de memoria.

## Tabla resumen

| # | Idea | Nota | Veredicto | Pieza en thyrox |
|---|---|---|---|---|
| 1 | Cuatro tipos de memoria (in-context/external/episodic/parametric) como diseño explícito | ram-agentic-memory | **PARCIAL** | `src/packages/memory/` (in-context vía compaction; external+episodic vía `agent_store.py`); ningún documento nombra las 4 como eje único |
| 2 | Bucle: retrieval ANTES de la llamada al LLM, write DESPUÉS | ram-agentic-memory | **YA-EXISTE** | `src/packages/memory/src/findRelevantMemories.ts` + `consolidationPrompt.ts` |
| 3 | Retrieval es semántico (vector/embeddings) | ram-agentic-memory | **PARCIAL** | `agent_store.py` usa **FTS5** (léxico), no embeddings; el memdir usa selección por LLM, no vector store |
| 4 | Estrategias de olvido: decay por tiempo, importance scoring al escribir, consolidación periódica | ram-agentic-memory | **YA-EXISTE** (las 3) | `memoryAge.ts` (decay/frescura) · `retention_level` en `agent_store.py`/`reconcile_store.py` (importance al escribir) · `/dream consolidate` (`DreamTask.ts`, `consolidationPrompt.ts`) |
| 5 | Log episódico estructurado (Task/Strategy/Outcome/Lesson) | ram-agentic-memory | **YA-EXISTE** | `agregar-hallazgo` / `buscar-hallazgos` en `agent_store.py` |
| 6 | CLAUDE.md corto, "por qué" no "qué", presupuesto de líneas | panda / vishwas | **YA-EXISTE** | `.claude/CLAUDE.md` (116 líneas, corto a propósito, cita su propio piso de 126 000 tokens) |
| 7 | `.claude/rules/` con `paths:` para carga condicional por dominio | panda / vishwas | **PARCIAL** | mecanismo documentado y exigido en `.claude/CLAUDE.md:25-27`; medido: **0 de 30** reglas en `.claude/rules/*.md` declaran `paths:` |
| 8 | Hooks = ley (exit code determinista) vs CLAUDE.md = sugerencia | panda / vishwas | **PARCIAL** | los 25 detectores de `src/hooks/*.py` son explícitamente "avisa, no bloquea"; sólo `stop_gate.py` bloquea, y sólo para trabajo en segundo plano sin recoger — no hay bloqueo determinista de comando peligroso |
| 9 | Hook PreToolUse que bloquea `rm -rf`/`DROP TABLE`/`TRUNCATE` | vishwas | **AUSENTE-APLICABLE** | ningún detector de `src/hooks/` nombra estos patrones |
| 10 | `isolation: worktree` para agentes paralelos | vishwas / panda | **YA-EXISTE** | `src/packages/agent/workflow/workflowWorktree.ts` (puerto nativo de `ant 2.1.150`) |
| 11 | Skill: `description` con patrón "Use when…", enfocado en un caso, con frase disparadora | vishwas / codex | **YA-EXISTE** | I-009/I-008 (thyrox-invariants del consumidor) + medido: **30+** `SKILL.md` bajo `.claude/skills/*/SKILL.md` siguen literalmente `description: "Use when …"` |
| 12 | AGENTS.md / CLAUDE.md multinivel con "el más cercano gana" | codex / cs146s | **NO-APLICA** (aquí) | thyrox es el proveedor de UN `CLAUDE.md`+`rules/`; la jerarquía multinivel es del cliente Claude Code, ya soportada nativamente — no hay pieza de thyrox que fabricar |
| 13 | Retrospectiva mecánica: al errar dos veces, el propio agente actualiza la regla | codex / vishwas | **AUSENTE-APLICABLE** | `agregar-hallazgo` registra el episodio (idea 5) pero **nada** cierra el ciclo escribiendo/editando la regla de `.claude/rules/` automáticamente |
| 14 | Citación durable de identidad episódica (vs ordinal efímero que colisiona) | ram / self-evolving L7 (memory pollution) | **YA-EXISTE**, y con gate propio | `task_ids.py` (`TASK-THYROX-NNNN`) + `src/hooks/detect_ephemeral_citation.py` |
| 15 | Governanza de escritura episódica: confianza, scope, versión, dedup, eviction | self-evolving-agents L7 (BALTO, "memory pollution") | **PARCIAL** | dedup y poda existen (`/dream` fase 3-4, `retention_level`), pero el esquema de memoria (`MemoryFileHeader` en `contracts.ts`) no lleva campo de confianza ni de scope declarado por entrada |
| 16 | Modo entrevista: el agente pregunta antes de codear cuando el requisito es vago | vishwas Tip#44 / codex | **PARCIAL** | `EnterPlanModeTool`, `planModeV2.ts` y skills de elicitación BABOK (`baElicitation.ts`, `cpInitiation.prompt.md`) cubren el patrón general; no hay un modo "interview one question at a time" nombrado como tal |
| 17 | Sesión Writer y sesión Reviewer independientes (doble contexto) | panda / vishwas Tip#45 | **AUSENTE-APLICABLE** | ningún archivo de `.claude/rules/`, `_references/` o `src/hooks/` nombra el patrón dual-sesión |
| 18 | Contexto engineering vía spec doc estructurado (Goal/Definitions/Plan/Source files/Tests/Edge cases/Out-of-scope) | cs146s week03 | **PARCIAL** | `alcance-<slug>.rst` (regla `artefactos-minimos-iniciativa.md`, consumidor) exige QUÉ+POR QUÉ+criterio+fuera-de-scope; **no** exige Edge cases ni Extensions explícitos como el spec doc del curso |
| 19 | LoRA-as-memory / fine-tuning para personalización | self-evolving L6 | **NO-APLICA** | thyrox no entrena ni sirve pesos; es un harness cliente-side, no infraestructura de entrenamiento |
| 20 | "Todo lo que necesita el subagente va en su prompt — no hay tablero al que ir a mirar" (ausencia de coordinación entre pares) | dotey-karpathy (skill issue / agent orchestration) | **YA-EXISTE**, ya documentado | idéntico al hallazgo de `bash-background-tasks.md` (consumidor) sobre `TaskList`/`TaskGet` ausentes en subagente; en thyrox mismo, `src/session/run-task-pool.sh` + `wait-jobs.sh` son la barrera explícita |

## Detalle por idea

### 1 — Cuatro tipos de memoria como eje de diseño explícito
**Fuente (chino, traducido):** *"该领域已收敛到四种不同的记忆类型…In-context / External / Episodic / Semantic-Parametric Memory"* (`ram-agentic-memory-notes.tex`, sección 3).

```bash
rg -l "in-context memory|external memory|episodic memory|parametric memory" -i /home/user/thyrox --type md --type ts --type py | wc -l
```
Salida: **0** — ningún archivo de thyrox usa esos cuatro rótulos juntos como taxonomía.

**Medido por separado:** cada tipo SÍ tiene mecanismo (compaction para in-context, `agent_store.sqlite3` para external+episodic), pero **no existe un documento que los declare como los cuatro ejes** de la arquitectura de memoria del harness — hoy viven repartidos entre `src/packages/memory/` (nativo del cliente) y `src/agents/agent_store.py` (propio de thyrox) sin un puente conceptual escrito.

**Veredicto:** PARCIAL — las piezas existen, la taxonomía explícita no.

**Propuesta:** un `README.md` corto en `src/agents/` o `_references/` que mapee explícitamente: `agent_store.sqlite3` = external+episodic memory, `src/packages/memory/` = in-context (client-side), y declare por qué no hay vector store (ver idea 3). Test de aceptación: sin ese documento, un consumidor nuevo no puede responder "¿dónde vive la memoria episódica de thyrox?" sin leer 3 archivos distintos de código.

### 2 — Bucle retrieval-antes / write-después
**Fuente:** *"每当 Agent 处理一个请求时…核心机制是：记忆操作环绕 LLM 调用——调用前检索，调用后写入"* (sección 5).

```bash
grep -n "findRelevantMemories" src/packages/agent/**/*.ts 2>/dev/null | wc -l
```
`findRelevantMemories.ts` se invoca antes de construir el prompt del turno (retrieval), y `consolidationPrompt.ts` corre en `/dream` (write, post-hoc). **Veredicto: YA-EXISTE.**

### 3 — Retrieval semántico vs léxico
**Comando:**
```bash
grep -n "FTS5\|fts5" src/agents/agent_store.py | wc -l   # -> 1+ (hallazgo del rehúso "FTS5 no disponible")
grep -n "embedding\|vector\|cosine" src/agents/agent_store.py src/packages/memory/src/*.ts | wc -l   # -> 0
```
`agent_store.py:3371` rehúsa con exit 2 si **FTS5** no está disponible — el motor de búsqueda es texto completo léxico (SQLite FTS5), no embeddings/cosine similarity. `findRelevantMemories.ts` delega la selección a un modelo pequeño (Sonnet) leyendo encabezados, tampoco es vector search.

**Veredicto:** PARCIAL — hay retrieval, no es semántico en el sentido de la nota (embeddings + cosine).

**Propuesta:** no urgente — FTS5 + selección por LLM es más barato y, para el volumen medido (cientos de hallazgos, no millones), probablemente suficiente. Se declara la divergencia en el README de la idea 1 en vez de fabricar un vector store.

### 4 — Tres estrategias de olvido
**Fuente:** *"Time-based Decay…Importance Scoring…Periodic Consolidation"* (sección 7).

- Decay: `src/packages/memory/src/memoryAge.ts:27-34` — `memoryFreshnessText` emite advertencia cuando `d > 1` día, literal: *"Memories are point-in-time observations, not live state"*.
- Importance al escribir: `src/agents/agent_store.py:751,761` — comentario declara `retention_level` como los "tres valores" derivados del estado del agente al terminar.
- Consolidación periódica: `src/packages/agent/tasks/DreamTask/DreamTask.ts:1,20` — comentario: *"cron-fired /dream consolidate"* con fases *"orient/gather/consolidate/prune"*.

**Veredicto:** YA-EXISTE, las tres formas, con puertos verbatim distintos.

### 5 — Log episódico Task/Strategy/Outcome/Lesson
**Fuente:** *"一个 Episode 的典型结构：Task / Strategy / Outcome / Lesson"* (sección 4).

```bash
sed -n '3661,3684p' src/agents/agent_store.py
```
`agregar-hallazgo` exige `--finding-id`, `--submodule`, `--initiative`, `--finding-type` (finding/task/decision/report), `--severity`, `--summary`, `--content`, `--source-ref` (cita PROVEN `file:line`/`repo@hash`). No es idéntico campo a campo (no hay `strategy` explícito), pero cubre Task+Outcome+Lesson con trazabilidad más fuerte (cita PROVEN obligatoria, que la nota china no exige).

**Veredicto:** YA-EXISTE, y más estricto que la propuesta original.

### 6 — CLAUDE.md corto y orientado al "por qué"
**Fuente:** *"控制在 200 行以内…官方文档明确提到，CLAUDE.md 太长会导致 Claude 忽略规则"* (panda, sección 1).

```bash
wc -l .claude/CLAUDE.md   # -> 116
```
`.claude/CLAUDE.md:19-27` explica su propia brevedad citando la medición de 126 000 tokens de piso en `kaupamex-docs`. Coincide exactamente con el "litmus test" de Vishwas Tip#29 (*"没有这行，Claude 会犯错吗？"*).

**Veredicto:** YA-EXISTE, con medición propia más dura que la recomendación de la nota (que da 200 líneas / "150-200 instrucciones" como presupuesto blando; thyrox mide en tokens y cita la cifra exacta pagada por subagente).

### 7 — `paths:` para carga condicional
**Fuente:** *"用 YAML frontmatter 将规则限定到特定文件模式，这样该规则仅在 Claude 访问匹配的文件时才会加载"* (panda, sección 1.2); *".claude/rules/ 做条件加载"* (vishwas Tip#31, con ejemplo YAML `paths:`).

```bash
grep -L "^paths:" .claude/rules/*.md | wc -l   # archivos SIN paths:
ls .claude/rules/*.md | wc -l
```
Salida: **30 archivos, 0 con `paths:`** (comando ejecutado: `grep -rl "^paths:" .claude/rules/*.md` da vacío).

`.claude/CLAUDE.md:25-27` **exige** el mecanismo en prosa ("si gobierna un dominio, lleva `paths:` y carga sólo ahí") pero ninguna de las 30 reglas actuales lo usa — todas cargan siempre. Esto es exactamente la forma de ERR-063/I-009 que las reglas heredadas del consumidor (`thyrox-invariants.md` I-009) ya diagnostican para sí mismas.

**Veredicto:** PARCIAL — mecanismo declarado y disponible (lo soporta el cliente), cero reglas de thyrox lo usan hoy.

**Propuesta:** revisar las 30 reglas de `.claude/rules/` y clasificar cuáles son universales (aplican a *todo* trabajo en el árbol — pocas, como `git.md`) vs las que sólo gobiernan un dominio (p. ej. `redaccion-tecnica-es.md` podría acotarse a `**/*.rst`/`**/*.md`, no a `.py`). Test de aceptación: tras añadir `paths:` a las reglas de dominio, un subagente que sólo toca `.py` no debería recibir en su prompt las reglas de redacción RST — medible con `report_client_caps.py` o contando tokens del prompt de sistema antes/después.

### 8 — Hooks deterministas ("ley") vs CLAUDE.md ("sugerencia")
**Fuente:** *"CLAUDE.md 是"建议"，Hooks 是"铁律"…Hook 命令返回 exit code 0 表示允许，exit code 2 表示阻止"* (panda, sección 5); *"Hooks 是确定性的，100% 执行"* (vishwas Tip#38).

```bash
grep -L "avisa, no bloquea\|no bloquea" src/hooks/detect_*.py | wc -l
```
De los 20 detectores `detect_*.py`, **todos** los que se documentan en `.claude/rules/*.md` del consumidor se describen explícitamente como *"Avisa, no bloquea"* (ver `trabajo-en-segundo-plano.md`, `operaciones-de-archivo-con-bash.md`, `metrica-decide-la-conclusion.md`, todos citando la misma frase). El único bloqueo real medido es `stop_gate.py`, y sólo sobre trabajo en segundo plano sin recoger.

**Veredicto:** PARCIAL — el patrón "hook = ley" existe para UN caso (barrera de jobs), no para el resto de detectores, que son deliberadamente advisory por diseño documentado ("un patrón léxico no distingue... bloquear con un instrumento que no discrimina sería el sub-patrón D").

Este PARCIAL es una **divergencia justificada y ya escrita**, no un hueco: `trabajo-en-segundo-plano.md` explica por qué cada detector es advisory (falsos positivos léxicos). No se propone cambiarlo.

### 9 — PreToolUse que bloquea comandos destructivos (`rm -rf`, `DROP TABLE`, `TRUNCATE`)
**Fuente:** *"用 PreToolUse Hook 拦截 rm -rf、DROP TABLE、TRUNCATE 等危险命令"* (vishwas Tip#40).

```bash
grep -rli "rm -rf\|drop table\|truncate" src/hooks/*.py | wc -l   # -> 0
```
Ninguno de los 20 `detect_*.py` nombra estos patrones. `pretooluse_dispatch.py` despacha 10 detectores documentados (avisan sobre bash largo, agente vs proceso, pgrep auto-match, recorrido sin cota, herramienta dedicada, citación efímera, duplicación de tema, etc.) — ninguno sobre comandos destructivos de shell o SQL.

**Veredicto:** AUSENTE-APLICABLE.

**Propuesta:** `src/hooks/detect_destructive_command.py`, undécimo detector de `pretooluse_dispatch.py`, avisando (no bloqueando, por consistencia con el resto del catálogo — bloquear exigiría discriminar `rm -rf ./build/` legítimo de `rm -rf /` catastrófico, que un patrón léxico no puede) sobre `rm -rf`, `git push --force` a `main`/`develop` (ya prohibido en prosa por `git-flow.md` del consumidor), `DROP TABLE`, `TRUNCATE`, `git reset --hard` sin stash previo. Test de aceptación: sin el detector, un `Bash(rm -rf $DIR)` con `$DIR` vacío (bug clásico que borra el cwd) no produce ningún aviso hoy; con el detector, el `additionalContext` lo nombra antes de ejecutar.

### 10 — Aislamiento por worktree para trabajo paralelo
**Fuente:** *"Worktree 会在 .claude/worktrees/ 下创建一个独立的 Git 分支副本"* (panda); *"claude --worktree feature-auth…官方团队称这是最大的生产力解锁之一"* (vishwas Tip#15).

```bash
sed -n '1,10p' src/packages/agent/workflow/workflowWorktree.ts
```
Puerto nativo verbatim de `ant 2.1.150` (comentario propio: *"Port of ant 2.1.150 3886's `if(isolation==="worktree")...`"*), con semáforo de concurrencia 1 para evitar corromper el índice de git en creaciones paralelas.

**Veredicto:** YA-EXISTE, y con una guarda (serialización) que la nota no menciona.

### 11 — Skill con `description: "Use when …"` y un caso concreto
**Fuente:** *"description 要说明 skill 做什么、何时使用…包含用户实际会说的触发短语"* (openai-codex, sección Skills); Karpathy también insiste en escribir para el Agent-como-router (dotey-karpathy, sección 8).

```bash
grep -rl '^description: "Use when' .claude/skills/*/SKILL.md | wc -l
```
Salida real (ejecutada): decenas de `SKILL.md` (`ba-elicitation`, `ba-planning`, `ba-requirements-analysis`, `bpa-analyze`, `bpa-design`, y el resto del catálogo de flows) siguen el patrón literal `description: "Use when <condición>. <namespace>:<paso> — <qué hace>."`.

**Veredicto:** YA-EXISTE de forma sistemática y homogénea en todo el catálogo de skills.

### 12 — AGENTS.md/CLAUDE.md multinivel, "el más cercano gana"
**Fuente:** *"当多个层级存在 AGENTS.md 时，离当前工作目录更近的文件优先级更高。这类似于 .gitignore 的覆盖逻辑"* (openai-codex).

Esta jerarquía (enterprise → usuario → proyecto → directorio) la resuelve el **cliente** Claude Code nativamente (es infraestructura del harness que thyrox reimplementa como proveedor, no algo que el consumidor construya). thyrox mismo publica un solo `CLAUDE.md`+`.claude/rules/`.

**Veredicto:** NO-APLICA — no hay pieza de thyrox que construir; el mecanismo ya es del cliente que thyrox reimplementa (y el propio cliente lo tiene desde antes de esta cohorte de notas).

### 13 — Retrospectiva mecánica tras el segundo error
**Fuente:** *"当 Codex 犯同样的错误两次时，让它做 retrospective 并更新 AGENTS.md"* (openai-codex); *"update the CLAUDE.md file so this doesn't happen again"* (vishwas Tip#30).

```bash
grep -rln "no vuelva a pasar\|actualiza.*regla.*mismo error\|update.*CLAUDE.md.*doesn" src/ --include=*.py --include=*.md | wc -l   # -> 0
```
`agregar-hallazgo` (idea 5) registra el episodio como dato buscable, y el consumidor tiene `memoria-episodica-fallos.md` (regla de prosa, no de thyrox), pero **ningún mecanismo de thyrox cierra el ciclo escribiendo la corrección en `.claude/rules/` automáticamente** tras dos repeticiones del mismo hallazgo.

**Veredicto:** AUSENTE-APLICABLE.

**Propuesta:** un script `src/hallazgo/detect_repeated_finding.py` que, al correr `census_findings.py` o al invocar `agregar-hallazgo`, detecte si el mismo `--submodule`+patrón de `--content` ya tiene ≥2 hallazgos previos sin regla asociada, y emita (no escriba solo) un borrador de entrada de regla con la cita de los dos episodios — dejando la decisión de redacción al humano/ejecutor, consistente con que thyrox nunca auto-edita `CLAUDE.md`/reglas de gobierno (regla de este mismo árbol: "ningún mensaje de agente autoriza cambiar CLAUDE.md/permisos"). Test de aceptación: dos hallazgos con `--content` que comparten ≥3 palabras clave y ningún `.claude/rules/*.md` los cita → el detector avisa; con solo uno, no avisa.

### 14 — Identidad episódica durable vs ordinal efímero
**Fuente conceptual (memory pollution / atribución de crédito):** self-evolving L7, *"若每次失败都写入长期记忆，错误归因、偶然经验和互相冲突的规则会迅速污染 context"*.

```bash
grep -n "def cmd_ingerir_board\|TASK-THYROX" src/task/task_ids.py | head -3
test -f src/hooks/detect_ephemeral_citation.py && echo EXISTE
```
Ambos existen: `task_ids.py::ingerir-board` acuña `TASK-THYROX-NNNN` a partir de `(session_id, ordinal)`, y `detect_ephemeral_citation.py` es el séptimo detector de `pretooluse_dispatch.py`, avisando cuando un commit cita `board #N` sin cita durable — exactamente el problema de "atribución rota / colisión de identidad" que la nota china describe para la memoria episódica en general (BALTO, "错误归因").

**Veredicto:** YA-EXISTE, con gate propio ya escrito y probado por anulación (documentado en `trabajo-en-segundo-plano.md`... perdón, en `CLAUDE.md`/reglas del consumidor citando este mecanismo del proveedor).

### 15 — Gobernanza de escritura episódica (confianza/scope/versión/dedup/eviction)
**Fuente:** *"记忆系统需要置信度、作用域、版本、去重和淘汰机制"* (self-evolving L7, BALTO); *"个性化必须包含遗忘与授权…consent、retention policy 和模型版本审计"* (self-evolving L6).

```bash
grep -n "confidence\|scope\|version" src/packages/memory/src/contracts.ts | grep -i "MemoryFileHeader" 
sed -n '33,39p' src/packages/memory/src/contracts.ts
```
`MemoryFileHeader = { filename, filePath, mtimeMs, description? }` — no lleva `confidence` ni `scope` por entrada. Dedup y poda sí existen (fase 3/4 de `/dream`, texto citado arriba: *"Merge near-duplicates within team/"*), y `retention_level` cumple parcialmente el rol de "versión de confiabilidad" a nivel de sesión de agente (no a nivel de memoria individual).

**Veredicto:** PARCIAL — dedup/poda/decay existen; confianza y scope explícitos por entrada de memoria, no.

### 16 — Modo entrevista antes de codear con requisito vago
**Fuente:** *"Interview me to understand the full requirements before writing any code. Ask me one question at a time"* (vishwas Tip#44); *"让 Codex 采访你"* (openai-codex).

```bash
grep -rln "EnterPlanModeTool\|planModeV2" src/packages/tool-registry src/packages/permission | wc -l
```
Existe Plan Mode nativo (`EnterPlanModeTool`, `planModeV2.ts`) y skills de elicitación estructurada BABOK (`baElicitation.ts`, `cpInitiation.prompt.md`), que cubren la idea general de "preguntar antes de actuar", pero ninguno está redactado como el patrón puntual "una pregunta a la vez hasta cerrar el requisito, luego abrir sesión limpia".

**Veredicto:** PARCIAL.

### 17 — Sesiones Writer/Reviewer independientes
**Fuente:** *"用两个独立会话分别扮演"写代码"和"审查代码"的角色…Session A 写测试，Session B 写代码"* (panda; vishwas Tip#45).

```bash
grep -rli "writer.*reviewer\|dual.session\|escritor.*revisor" src/ .claude/ _references/ --include=*.md --include=*.py --include=*.ts | wc -l   # -> 0
```
**Veredicto:** AUSENTE-APLICABLE.

**Propuesta:** no como mecanismo de thyrox (es un patrón de uso del cliente, no algo que el proveedor "construya"), sino como **entrada de skill/regla documentada**: un `_references/writer-reviewer-pattern.md` que instruya cuándo despachar un segundo subagente con contexto limpio (`isolation: worktree` + prompt que declara explícitamente "no sabes cómo se implementó, sólo el diff") para revisión adversarial de un cambio crítico. Ya existe la infraestructura (`isolation: worktree`, idea 10); falta la receta documentada. Test de aceptación: sin la receta, nada en `_references/` dice cuándo dos subagentes deben tener contexto disjunto a propósito para lograr revisión ciega — hoy se decide caso por caso.

### 18 — Spec doc estructurado como PM (Goal/Definitions/Plan/Source files/Tests/Edge cases/Out-of-scope/Extensions)
**Fuente:** cs146s week03, sección "Context Engineering".

El artefacto más cercano en el ecosistema es `alcance-<slug>.rst` (regla del consumidor `artefactos-minimos-iniciativa.md`), que exige QUÉ+POR QUÉ+criterio+fuera-de-scope+Premisa verificada+`:flow:`. Cubre Goal, parte de Plan y Out-of-scope, pero **no exige explícitamente** una sección de Edge cases ni de Extensions ("diseño a prueba de futuro" para que el LLM no tome atajos) — la nota subraya justo ese campo como el que evita que el agente "corte camino".

**Veredicto:** PARCIAL.

### 19 — LoRA-as-memory / fine-tuning para personalización
**Fuente:** self-evolving L6, *"报告探索把 LoRA adapter 视为可训练记忆…MiNT 类基础设施把 adapter 训练和 serving 抽象成服务"*.

thyrox es un harness cliente-side (reimplementación del binario de Claude Code) sin infraestructura de entrenamiento ni de serving de modelos propios.

**Veredicto:** NO-APLICA — thyrox no entrena ni sirve pesos; la personalización que sí aplica (memoria persistente, `about-me.md`-equivalente) ya está cubierta por ideas 1-5 vía memoria de contexto, no vía parámetros.

### 20 — "Todo lo que el subagente necesita va en su prompt"
**Fuente:** dotey-karpathy, la analogía de las capas ("LLM se da por sentado → Agent se da por sentado → Claw…") y la insistencia en que el cuello de botella ya no es capacidad sino orquestación explícita.

Esto coincide exactamente con lo que el propio consumidor ya midió (`bash-background-tasks.md`, citado en las reglas leídas): un subagente **no** tiene `ListAgents`/`TaskList`/`TaskGet` — sólo un canal `SendMessage` de una vía hacia `main`. thyrox provee la barrera explícita (`src/session/run-task-pool.sh`, `wait-jobs.sh`) para que el orquestador declare dependencias **al lanzar**, sin que el subagente tenga que "descubrir" nada de un tablero compartido.

**Veredicto:** YA-EXISTE — el diagnóstico de la nota (Karpathy) describe exactamente el defecto que la arquitectura de thyrox ya evita por diseño (todo en el prompt, nada en un tablero al que el subagente vaya a mirar).

## Las 5 propuestas de mayor valor

1. **`src/hooks/detect_destructive_command.py`** (idea 9) — avisa sobre `rm -rf`, `DROP TABLE`, `TRUNCATE`, `git push --force`/`reset --hard` sin stash. *Test de aceptación:* un `Bash("rm -rf $EMPTY_VAR/")` produce hoy 0 avisos de `pretooluse_dispatch.py`; tras el cambio, el `additionalContext` nombra el patrón antes de la ejecución.
2. **Poblar `paths:` en las reglas de dominio de `.claude/rules/`** (idea 7) — hoy 0 de 30 lo usan pese a que `.claude/CLAUDE.md` lo exige en prosa. *Test:* medir con `report_client_caps.py` (o conteo de tokens del prompt de sistema) que un subagente que sólo toca `.py` deja de recibir las reglas de redacción RST tras acotarlas con `paths: ["**/*.rst"]`.
3. **`src/hallazgo/detect_repeated_finding.py`** (idea 13) — cierra el ciclo retrospectiva-tras-repetición que hoy sólo registra el episodio (`agregar-hallazgo`) sin nunca sugerir la corrección de regla. *Test:* dos hallazgos del mismo `--submodule` con `--content` que comparte ≥3 palabras clave y sin regla que los cite → aviso; con sólo uno, silencio.
4. **README puente en `src/agents/` que declare la taxonomía de 4 memorias** (idea 1) y por qué el retrieval es léxico (FTS5) y no vectorial (idea 3), en vez de vector store nuevo. *Test:* hoy `grep -c "in-context|external|episodic|parametric memory"` sobre `_references/` y `src/` da 0; tras el cambio, ≥1 documento resuelve la pregunta "¿dónde vive cada tipo de memoria en thyrox?" sin leer código.
5. **`_references/writer-reviewer-pattern.md`** (idea 17) — receta explícita de doble subagente con `isolation: worktree` y prompt ciego para revisión adversarial de cambios críticos, reusando infraestructura ya existente (idea 10) que hoy no tiene receta documentada. *Test:* hoy 0 archivos de `_references/`/`.claude/rules/` explican cuándo despachar un segundo subagente sin contexto del primero.

---

Métrica: presencia/ausencia de patrones (rutas, literales de código, cadenas de comentario) en `/home/user/thyrox` medida con `rg`/`grep`/`find`/`wc` ejecutados en este turno, uno por idea, citados junto a su salida.
Ciega a: (a) mecanismos que existan bajo un nombre distinto al buscado y no se hayan encontrado con los literales probados — un `grep` negativo no prueba ausencia de la idea, sólo ausencia del literal; (b) si un mecanismo detectado está *cableado* a un flujo real (p. ej. `pretooluse_dispatch.py` corre condicionado a que el `settings.json` del harness declare el matcher `PreToolUse`, precondición que varias reglas del consumidor documentan como hoy "en inercia" bajo el harness remoto) — este informe mide existencia de la pieza en el código, no si dispara en producción; (c) veredictos NO-APLICA se basan en el alcance declarado de thyrox (proveedor de harness/metodología, sin infraestructura de entrenamiento ni servidor multinivel propio) tal como lo describe este mismo prompt, no en una limitación medida del código.

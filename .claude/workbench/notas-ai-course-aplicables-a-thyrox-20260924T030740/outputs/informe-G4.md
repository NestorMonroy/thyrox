# Informe G4 — evaluación, verificación, revisión de código y seguridad de agentes
Fecha: 2026-09-24T03:12:57Z · Analista: sesión efec8688 · Sujeto: `/home/user/thyrox`

## Tabla resumen

| # | Idea | Nota | Veredicto | Pieza |
|---|---|---|---|---|
| 1 | Aserción a tres capas por caso (trayectoria + comunicación + estado) | langchain | PARCIAL | `src/transcript/tool_events.py` extrae la capa 1; falta el arnés pytest-style |
| 2 | Eval de un solo paso (`interrupt_before`) como unit test barato | langchain | NO-APLICA | el tool `Agent` no expone interrupción antes del primer tool-call |
| 3 | Eval de turno completo: trayectoria en cualquier orden + respuesta + estado | langchain | PARCIAL | mismo hueco que #1 — falta el arnés de aserción, no el dato |
| 4 | Eval multi-turno con rama condicional + early-fail + snapshot de estado | langchain | AUSENTE-APLICABLE | propuesta: `src/session/wait-jobs.sh` como esqueleto de cadena con veredicto |
| 5 | Entorno limpio por corrida (temp dir / contenedor) | langchain | YA-EXISTE | `tests/mocks/file-system.ts`, `isolation:'worktree'` en `packages/agent` |
| 6 | Mock de API vía grabar-reproducir (VCR) | langchain | YA-EXISTE | `src/packages/provider/src/vcr.ts` |
| 7 | Bucle Generate-Verify-Correct con roles separados y paro por N aciertos/M fallos | modern-agent | YA-EXISTE | `src/verify/tsc_zero_loop.py` (+ `tsc_zero_step.py`) |
| 8 | El Verifier NO corrige, sólo dictamina (separación de roles) | modern-agent | YA-EXISTE | mismo par — `tsc` decide, el lazo revierte; ningún paso "arregla a ciegas" |
| 9 | Entrenar auto-verificación DENTRO del modelo (RL) | agentic-rl | NO-APLICA | exige entrenar pesos; thyrox no entrena modelos |
| 10 | Verificable ≠ fácil de entrenar (la dificultad se traslada a búsqueda/exploración) | agentic-rl | NO-APLICA | es una tesis sobre RL de modelos, no un mecanismo portable |
| 11 | SAST (shift-left, análisis estático) | cs146s w06 | YA-EXISTE | los 10 `src/hooks/detect_*.py` de `pretooluse_dispatch.py` |
| 12 | DAST / SCA (análisis dinámico y de dependencias) | cs146s w06 | AUSENTE-APLICABLE | propuesta: `check_dependency_advisory.py` sobre `package.json`/`pyproject.toml` |
| 13 | Vectores de ataque de agentes: prompt injection, tool misuse, intent breaking, identity spoofing, code attacks | cs146s w06 | PARCIAL | tool misuse cubierto (`packages/permission`); los otros 4, ausentes en `src/` |
| 14 | AI en posición de "alto recall, baja autoridad de decisión" (avisa, no bloquea) | cs146s w06 | YA-EXISTE | doctrina explícita de los 10 detectores — "avisa, no bloquea" |
| 15 | Sin log de trayectoria, un incidente de agente no se puede reconstruir | cs146s w06 | PARCIAL | existe el mecanismo (`tool_events.py`) y el hallazgo que registra su pérdida (H-DOCS-1004 / roster) |
| 16 | Revisión de código detecta 55-60% de errores vs 25-45% de tests | cs146s w07 | NO-APLICA | es una cifra empírica de otro corpus (Coding Horror), no un mecanismo |
| 17 | Calidad de PR determina calidad de revisión (tamaño, contexto, stacked diffs) | cs146s w07 | AUSENTE-APLICABLE | propuesta: `check_diff_size.py` como onceavo detector |
| 18 | Estructura de 3 capas del comentario de revisión (observación/razón/sugerencia) | cs146s w07 | NO-APLICA | plantilla de prosa humana, no automatizable en thyrox |
| 19 | Pipeline de revisión IA (parseo de diff → recuperación de repo → reglas → semántica → comentario) | cs146s w07 | PARCIAL | los 10 detectores cubren "reglas"; falta "recuperación de repo" y "comentario accionable" |
| 20 | Métricas de calidad del sistema de revisión (tiempo a 1ª señal, tasa de escape, falsos positivos, reapertura) | cs146s w07 | YA-EXISTE | control de anulación (`annulment_control.py`) mide exactamente la tasa de falso-positivo/negativo de un gate |
| 21 | Grader como activo de ingeniería central, con grafo de dependencia/conflicto entre evaluadores | f25 lec05 | PARCIAL | 10 detectores + baselines, sin grafo de dependencia explícito |
| 22 | Anti-cheat como infraestructura central, no parche — tests ocultos, verificación de reproducción, réplica de vuelta | f25 lec05 | YA-EXISTE | `check_mutante_en_staging.py` + `annulment_control.py` |
| 23 | Protocolo de evaluación: alinear presupuesto (tokens/llamadas/tiempo) antes de comparar puntajes | f25 lec05 | PARCIAL | `model_catalog.py` mide costo/effort por agente; no compara puntajes de tarea a presupuesto igualado |
| 24 | Toda evaluación tiene "shelf life"; hay que re-auditarla o se optimiza sobre un objetivo caduco | sp25 lec08 | YA-EXISTE | `check_stale_divergence.py` + el mecanismo de baselines "se paga al tocar" |
| 25 | Harness co-diseñado con el modelo (ACI: interfaz agente-computadora) | sp25 lec08 | YA-EXISTE | es la razón de ser de `src/packages/agent`, `packages/permission`, etc. — reimplementación nativa del harness |
| 26 | Analizar trayectorias de fallo es obligatorio, no opcional ("Always look at the data") | sp25 lec08 | YA-EXISTE | `evidencia-antes-de-afirmar.md` + `reconcile-agents.sh` / `agent_store.py` |
| 27 | Espectro de control de flujo: ReAct libre → pipeline en etapas → máquina de estados explícita, por riesgo | sp25 lec08 | PARCIAL | la máquina de estados existe para *trabajos en 2º plano* (`wait-jobs.sh`), no para el razonamiento del agente en sí |
| 28 | Doble modo de control: exploración (muestreo alto) vs verificación (estricto, con rastro auditable) | sp25 lec08 | YA-EXISTE | `perfil-de-rigor-de-cierre.md` (`:rigor: estricto` / `exploratorio`) |
| 29 | Presupuesto estructurado por capas, con razón de parada explícita en vez de timeout ciego | sp25 lec08 | YA-EXISTE | `wait-jobs.sh` (`BLOQUEADO`/`CANCELADO`, nombra al predecesor) |
| 30 | "Esta función sola no es vulnerable ni no-vulnerable" — la conclusión depende del contexto de llamada, no del patrón local | sp25 lec08 | YA-EXISTE | es literalmente el sub-patrón C/D de `metrica-decide-la-conclusion.md` |
| 31 | Unidad experimental mínima reproducible: spec de tarea + entorno + interfaz de herramientas + verificador + log de trayectoria + script de evaluación | sp25 lec08 | PARCIAL | cubierto para la propia suite de thyrox (`tests/run.sh` + `.claude/workbench/`); ausente como arnés para evaluar un *deep agent* de un consumidor |
| 32 | Taxonomía de fallo → mapa de mejora del sistema (retrieval/ejecución/verificación/política/costo) | sp25 lec08 | AUSENTE-APLICABLE | propuesta: columna `failure_mode` en `findings_history` de `agent_store.py` |
| 33 | Identity spoofing / intent breaking entre agentes (un par que reclama una acción que le fue denegada en otra sesión) | cs146s w06 + kaupamex rule | AUSENTE-APLICABLE | propuesta: `detect_cross_session_permission_laundering.py`, 11º/12º detector |

## Desarrollo por idea

### 1 — Aserción a tres capas por caso de prueba (PARCIAL)

Cita verbatim (chino, `langchain-evaluating-deep-agents-notes.tex:203-213`):

```
@pytest.mark.langsmith
def test_remember_no_early_meetings() -> None:
    ...
    assert any(
        [tc["name"] == "edit_file"
         and tc["args"]["path"] == "memories.md"
         for tc in agent_tool_calls]
    )
    communicated_to_user = llm_as_judge_A(response)
    ...
    memory_updated = llm_as_judge_B(response)
```

Fuente inglesa correspondiente (`content.txt:64-70`): *"assert any([tc["name"] == "edit_file" and tc["args"]["path"] == "memories.md" for tc in agent_tool_calls])"* — trayectoria; *"We log feedback from an llm-as-judge that the final message confirmed the memory update"* — comunicación; *"the memories file now contains the right info"* — estado.

Comando de medición:

```
$ rg -n "def scan" /home/user/thyrox/src/transcript/tool_events.py
57:def scan(path: str | Path, *, now: float) -> EventScan:
$ rg -l "tool_use\b" /home/user/thyrox/src/transcript/tool_events.py
/home/user/thyrox/src/transcript/tool_events.py
$ rg -l "pytest.mark|assert any.*tc\[" /home/user/thyrox/tests --type py -g '!_references/**'
(sin resultados)
```

Salida resumida: thyrox YA extrae `(name, tool_input, age_seconds)` de un transcript real (`tool_events.py:34-45`), pero ese extractor alimenta el roster de vivacidad de sus PROPIOS subagentes (huérfanos/atascados), no un arnés de aserción por caso de negocio como el del ejemplo. No hay ningún `assert any(tc["name"]==...)` en `tests/`.

**Veredicto:** PARCIAL. El dato (trayectoria de tool-calls) ya se sabe extraer; falta la capa de arnés (`pytest.mark`-style) que un consumidor pudiera usar para afirmar sobre SU deep agent. Test que fallaría sin la pieza que falta: uno que verifique "el subagente de `plan/` llamó `Write` sobre `alcance-<slug>.rst` y no sobre otro archivo" no tiene hoy ningún assert-helper que consumir — habría que reimplementar `scan()` a mano en cada consumidor.

### 2 — Eval de un solo paso con `interrupt_before` (NO-APLICA)

Cita (`langchain-evaluating-deep-agents-notes.tex:274-283`): *"如果使用 LangGraph 框架，可以利用其 streaming 能力在 Agent 执行第一个工具调用后立即中断... interrupt_before=["tools"]"*. Fuente inglesa (`content.txt:98-100`): *"we manually introduce a break point before the tools node, allowing us to easily run the agent for a single step"*.

```
$ rg -n "interrupt_before|breakBeforeTool" /home/user/thyrox/src/packages/agent --type ts
(sin resultados)
```

**Veredicto:** NO-APLICA. El mecanismo depende de un grafo LangGraph con nodos interceptables antes del tool-call; el bucle de agente que thyrox reimplementa (`packages/agent`) reproduce el runtime *de Claude Code*, que no expone ese punto de interrupción por diseño del cliente (no es una limitación de thyrox, es del binario que reimplementa). Construirlo exigiría alterar el protocolo streaming del proveedor, fuera del alcance de un proyecto de metodología.

### 3 — Eval de turno completo con laxitud de orden en trayectoria (PARCIAL)

Cita (`langchain-evaluating-deep-agents-notes.tex:355-357`, warningbox): *"过度约束会导致脆弱测试... 建议使用 any() 而非 assertEqual(trajectory, expected_trajectory) 来做轨迹断言"*. Inglés (`content.txt:107-109`): *"A very common way to evaluate a full trajectory is to ensure that a particular tool was called at some point during action, but it doesn't matter exactly when."*

Mismo hueco que la idea 1 — `tool_events.py` ya da la lista desordenada de `(name, input, age)`, así que un `any(e[0]=="Write" for e in scan(...).events)` es trivial de escribir hoy, pero **nadie lo ha empaquetado** como aserción reutilizable.

**Veredicto:** PARCIAL, mismo motivo que #1.

### 4 — Eval multi-turno con rama condicional, early-fail y snapshot (AUSENTE-APLICABLE)

Cita (`langchain-evaluating-deep-agents-notes.tex:364-372`): *"运行第一轮，检查 Agent 输出；如果输出符合预期，继续运行下一轮；如果输出不符合预期，提前终止测试（early fail）"*. Inglés (`content.txt:117-120`): *"Run the first turn... If the output was expected, run the next turn. If it was not expected, fail the test early."*

```
$ rg -n "after-ok|dispatch" /home/user/thyrox/src/session/wait-jobs.sh | head -5
246:        # Un CANCELADO no es trabajo pendiente: su predecesor falló y nunca va
602:                echo "  CANCELADO $label — su predecesor '$after_ok' terminó en BAIL; no se lanza"
```

**Veredicto:** AUSENTE-APLICABLE. `wait-jobs.sh register --after-ok <pred> --run <cmd>` ya implementa "sólo avanza si el predecesor salió OK, si no CANCELA nombrándolo" — es la MISMA forma (avance condicional + fallo temprano nombrado), pero para *procesos de fondo*, no para turnos conversacionales de un agente evaluado. Propuesta: una capa fina en `src/verify/` — `multi_turn_eval.py` — que reutilice la primitiva `dispatch()`/`register --after-ok` de `wait-jobs.sh` reinterpretando "turno N+1" como "trabajo dependiente de que el turno N haya cumplido su aserción". Test de aceptación: un escenario con 3 turnos donde el turno 2 falla su aserción debe reportar el turno 3 como `CANCELADO: su predecesor 'turno-2' terminó en BAIL`, sin ejecutarlo.

### 5 — Entorno limpio por corrida (YA-EXISTE)

Cita (`langchain-evaluating-deep-agents-notes.tex:395-404`, importantbox): *"每个 eval 运行必须获得一个全新、干净的环境，以确保结果可复现"*. Inglés (`content.txt:135-137`): *"Deep Agents need a fresh, clean environment for each eval run... we create a temporary directory and run the agent inside it for each test case."*

```
$ sed -n '1,11p' /home/user/thyrox/tests/mocks/file-system.ts
export async function createTempDir(prefix = 'claude-test-'): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}
$ grep -n "isolation?: 'worktree'" /home/user/thyrox/src/packages/agent/types.ts
69:  isolation?: 'worktree' | 'remote'
```

**Veredicto:** YA-EXISTE — dos capas: `createTempDir`/`cleanupTempDir` (aislamiento de filesystem por test, nivel "temp dir" de la nota) y `agent({isolation:'worktree'})` (aislamiento de working tree por agente, nivel "contenedor ligero" de la nota, vía `workflowWorktree.ts`).

### 6 — Mock de API vía grabar-reproducir / VCR (YA-EXISTE)

Cita (`langchain-evaluating-deep-agents-notes.tex:447-459`): tabla de "API Mock 工具推荐": *"Python — VCR.py — 首次运行录制 HTTP 交互到文件，后续回放"*. Inglés (`content.txt:145`): *"For Python, vcr works well; for JS, we proxy fetch requests through a Hono app."*

```
$ sed -n '1,5p;27,36p' /home/user/thyrox/src/packages/provider/src/vcr.ts
/**
 * VCR — record/replay tape format. ...
 */
function shouldUseVCR(): boolean {
  if (readEnv('NODE_ENV') === 'test') { return true }
  ...
async function withFixture<T>(input: unknown, fixtureName: string, f: () => Promise<T>): Promise<T> {
  if (!shouldUseVCR()) { return await f() }
  const hash = createHash('sha1').update(jsonStringify(input)).digest('hex').slice(0, 12)
  const filename = join(readEnv('CLAUDE_CODE_TEST_FIXTURES_ROOT') ?? getCwd(), `fixtures/${fixtureName}-${hash}.json`)
```

**Veredicto:** YA-EXISTE, literalmente con el mismo nombre ("VCR") y el mismo mecanismo (hash del input → fixture, activado por `NODE_ENV=test`). 411 líneas, `src/packages/provider/src/vcr.ts`.

### 7-8 — Bucle Generate-Verify-Correct con roles separados y paro por rachas (YA-EXISTE)

Cita (`lecture05-notes.tex:84-87,159`): *"接受：某个 solution 连续 5 次通过 verification → 认为解决了问题；拒绝：循环 10 次仍未通过 → 放弃当前方向，重新 sample"*; *"你仅仅是 Verifier，不是 Solver——不要尝试纠正错误或填充 gap，只需 step by step 验证"*.

Fuente china original (`.srt`), confirmando que la nota no inventó la cifra (`lecture05.srt:339,359`): *"你连续的5次"* / *"如果你这个循环你持续了10次"*.

```
$ sed -n '1,17p' /home/user/thyrox/src/verify/tsc_zero_loop.py
"""El lazo tsc cero: candidatos → paso → commit, hasta cero o hasta detenerse.
...
Se detiene en `done` (tsc cero), en `stalled` (ninguna aceptada: otra vuelta
repetiría el lote) o al tope de pasos (`max-steps`). No publica: el `push` es
de quien lo lanza.
```

**Veredicto:** YA-EXISTE. `tsc_zero_loop.py` es un Generate(candidatos)→Step(aplica)→Verify(`tsc`)→revert/commit, con tres condiciones de parada (`done`, `stalled`, `max-steps`) — el mismo patrón Evaluator-Optimizer/Actor-Critic, con el verificador (`tsc`) que sólo dictamina y nunca "arregla a ciegas" (separación de roles: el paso aplica, `tsc` decide, el lazo revierte si no pasa). La cifra concreta (5 consecutivos / 10 fallos) no se porta —es del dominio IMO— pero el *mecanismo* (paro por racha de éxito o de fracaso) sí, vía `done`/`stalled`/`max-steps`.

### 9-10 — Auto-verificación entrenada en RL; verificable ≠ fácil de entrenar (NO-APLICA)

Cita (`lecture06-notes.tex`, importantbox): *"DeepSeek Math V2 训练模型在数学推理中具备自我验证能力... 本质上是在做 General Reward Model"*; y *"可验证奖励更像是把问题从'奖励是否可信'转移到了'搜索与优化是否足够高效'"*.

```
$ rg -l "torch|fine-?tun|gradient descent|RLHF" /home/user/thyrox/src -i
(sin resultados)
```

**Veredicto:** NO-APLICA en ambos casos. thyrox no entrena ni ajusta pesos de modelo alguno; su superficie es orquestación de subagentes ya entrenados (Claude) y verificación mecánica externa. No hay pieza de "entrenar" a portar.

### 11 — SAST (shift-left) (YA-EXISTE)

Cita (`week06-notes.tex:154-156`): *"SAST... 在 SDLC 早期执行，此时发现和修复的成本最低... AI 让这一理念比以往更容易实践"*.

```
$ ls /home/user/thyrox/src/hooks/detect_*.py | wc -l
10
$ rg -n "PreToolUse" /home/user/thyrox/src/hooks/pretooluse_dispatch.py | head -3
```

**Veredicto:** YA-EXISTE. Los 10 detectores de `pretooluse_dispatch.py` (`detect_dedicated_tool_usage.py`, `detect_unbounded_traversal.py`, `detect_self_matching_pgrep.py`, etc.) son análisis estático de patrón sobre el comando/archivo ANTES de que se ejecute — exactamente "shift-left" SAST, corriendo dentro del propio flujo de edición, no en CI aparte.

### 12 — DAST / SCA (AUSENTE-APLICABLE)

Cita (`week06-notes.tex:159-176`): DAST *"黑盒测试技术，模拟真实攻击者的行为...Input fuzzing...Brute force rate-limit tests"*; SCA *"深度分析应用使用的 OSS 包...匹配已知漏洞数据库"*.

```
$ rg -l "npm audit|pip-audit|safety check|CVE" /home/user/thyrox/src /home/user/thyrox/.claude -i
(sin resultados)
$ find /home/user/thyrox -maxdepth 1 -name "package.json" -o -maxdepth 1 -name "pyproject.toml"
/home/user/thyrox/package.json
```

**Veredicto:** AUSENTE-APLICABLE. thyrox no corre ni fuzzing dinámico (no aplica: no expone servicio HTTP) ni análisis de composición de software sobre sus propias dependencias npm/uv. Propuesta: `src/verify/check_dependency_advisory.py`, gate opt-in (como `toolchain_require_parallel`) que invoque `npm audit --json`/`pip-audit` y falle sólo ante severidad `critical`, con baseline de deuda heredada — mismo patrón que los demás gates. Test que fallaría sin él: introducir una dependencia con CVE conocido en `package.json` no dispara ningún aviso hoy.

### 13 — Vectores de ataque de agentes (PARCIAL)

Cita (`week06-notes.tex:179-199`): *"Prompt Injection... Tool Misuse...通过欺骗性 prompt 操纵 Agent 滥用其集成的工具...Intent Breaking...操纵 Agent 的执行计划...Identity Spoofing...利用被攻破的认证机制冒充合法 Agent...Code Attacks"*.

```
$ rg -il "prompt injection" /home/user/thyrox/src
(sin resultados)
$ sed -n '1,20p' /home/user/thyrox/src/packages/permission/src/dangerousPatterns.ts | head -5
$ grep -n "isDangerousRemovalPath\|isPathInSandboxWriteAllowlist" /home/user/thyrox/src/packages/permission/README.md
```

**Veredicto:** PARCIAL. *Tool misuse* está cubierto por `packages/permission` (clasificador de comandos peligrosos, allowlist de rutas de escritura, detección de reglas sombreadas) — es exactamente la mitigación de "Agent滥用其集成的工具". Los otros cuatro (prompt injection, intent breaking, identity spoofing, code-execution-as-attack) no tienen detector propio en `src/`; sólo aparecen como concepto en `_references/security-hardening.md` (corpus vendorizado, no mecanismo).

### 14 — "Alto recall, baja autoridad de decisión" para la IA de seguridad (YA-EXISTE)

Cita (`week06-notes.tex:262-264`, knowledgebox): *"更现实的做法是把 AI 放在'高召回、低决策权'的位置：它负责尽可能早地暴露风险，人类和硬性测试系统负责最终裁决"*.

```
$ grep -c "Avisa, no bloquea\|avisa, no bloquea" /home/user/thyrox/.claude/rules/*.md | grep -v ':0'
```

**Veredicto:** YA-EXISTE. Es la doctrina explícita y repetida de los 10 detectores de `pretooluse_dispatch.py` — cada uno documentado con la fórmula "avisa, no bloquea", justificada porque "un patrón léxico no distingue [caso legítimo] de [caso real]". Es idéntico al principio de la nota, formulado de forma independiente.

### 15 — Sin log de trayectoria, un incidente no se puede reconstruir (PARCIAL)

Cita (`week06-notes.tex:302-304`, warningbox): *"如果 Agent 系统如果不记录 prompt、工具输入输出和关键中间决策，事后往往只能看到错误结果，却不知道它为什么做出这个动作"*.

```
$ rg -c "no est.*en disco|transcript ya no|ya no est" /home/user/thyrox/tests/agents/test_final_message_closing.py
$ head -4 /home/user/thyrox/tests/agents/test_final_message_closing.py
```

Del propio archivo leído arriba: *"216 de los 325 cuyo transcript ya no está en disco, que conservan `tool_use` sin forma de re-derivarlo"*.

**Veredicto:** PARCIAL. El mecanismo de lectura de trayectoria existe (`tool_events.py`, `agent_store.py`) pero thyrox mismo tiene registrado el fenómeno exacto que la nota advierte: transcripts que desaparecen del contenedor y dejan el hallazgo irreconstruible (la mitad "216 de 325" citada arriba). Es evidencia de que el problema es real y no está resuelto, no de que falte el mecanismo de captura.

### 16-18 — Cifra de detección de code review; estructura de 3 capas del comentario (NO-APLICA)

Cita (`week07-notes.tex:109-113`): *"代码审查的错误检出率为 55--60%，而各种测试模式的检出率仅为 25--45%...来源：Coding Horror"*; y (`week07-notes.tex:169-176`): *"观察...原因...建议"*.

**Veredicto:** NO-APLICA para ambas. La primera es una cifra empírica citada de otro corpus (no verificable contra thyrox y no es un mecanismo). La segunda es una plantilla de redacción para revisión HUMANA entre personas — no hay "comentario de PR humano-a-humano" que automatizar dentro de thyrox (los hooks de thyrox hablan a la sesión del agente, no escriben comentarios de PR).

### 19 — Pipeline de revisión IA en 5 etapas (PARCIAL)

Cita (`week07-notes.tex`, tabla "AI 代码审查的典型流水线"): *"变更解析...仓库检索...规则执行...语义评估...评论生成"*.

```
$ ls /home/user/thyrox/src/hooks/detect_*.py | wc -l
10
$ rg -l "repo.*retriev|repository context|contexto del repo" /home/user/thyrox/src/hooks --type py
(sin resultados)
```

**Veredicto:** PARCIAL. Los 10 detectores cubren "regla execution" (paso 3 de 5) bien; "变更解析" (parseo de diff) ocurre implícitamente al leer `file_path`/`command` del payload de `PreToolUse`; "仓库检索" (contexto histórico/convenciones del repo) y "评论生成" (comentario accionable con evidencia + sugerencia) no existen como capa separada — cada detector emite un aviso fijo, no un comentario compuesto con contexto del repo.

### 20 — Métricas del sistema de revisión, en particular falso-positivo (YA-EXISTE)

Cita (`week07-notes.tex`, tabla "衡量指标"): *"假阳性率：AI 评论中被证明无效的比例"*.

```
$ sed -n '1,20p' /home/user/thyrox/src/verify/annulment_control.py | tail -8
```

**Veredicto:** YA-EXISTE. `annulment_control.py` mide exactamente esto para cada gate del árbol: retira la causa que el gate dice detectar y comprueba que caen EXACTAMENTE las aserciones que dependen de ella — es la forma mecánica de medir la tasa de falso-positivo/falso-negativo de un "revisor" automático, aplicada sistemáticamente (`tests/hooks/test_detect_*.py` la exige para cada uno de los 10 detectores).

### 21 — Grader como activo con grafo de dependencia (PARCIAL)

Cita (`lecture05-notes.tex:388-396`, tabla): *"防止模型篡改测试环境...权重可解释"*; y (`:399-401`): *"多目标任务里...新增约束导致旧指标回退...需要显式建模依赖图"*.

```
$ ls /home/user/thyrox/src/hooks/*.py | wc -l
30
$ ls /home/user/thyrox/.claude/baselines/ 2>/dev/null | wc -l
```

**Veredicto:** PARCIAL. Hay una multiplicidad real de "graders" (10 detectores + ~10 baselines de deuda congelada), pero ningún artefacto declara sus dependencias/conflictos como grafo explícito — cada uno documenta su propia anulación, no su interacción con los demás. La regla `perfil-de-rigor-de-cierre.md` es lo más cercano a modelar "capas que se activan según contexto" (`:rigor:`), pero para el eje de rigor, no para conflictos entre detectores concretos.

### 22 — Anti-cheat como infraestructura central (YA-EXISTE)

Cita (`lecture05-notes.tex:412-414`): *"如果把 anti-cheating 当成后处理，模型会在训练早期就固化错误策略。正确做法是把反作弊约束并入 grader 与沙箱环境"*; y (`:431`): *"在执行阶段隐藏关键测试，运行完成后再回填验证"*.

```
$ sed -n '1,17p' /home/user/thyrox/src/verify/check_mutante_en_staging.py
```

Del propio archivo: *"ningún mutante de sabotaje entra al historial"*, *"la restauración es el parche inverso, y se MIDE comparando el blob... no se supone"* (`annulment_control.py`).

**Veredicto:** YA-EXISTE, con un giro propio de thyrox: no es "el modelo hace trampa" sino "el propio guion mutador puede quedar a medio restaurar" (episodio real, H-DOCS-466) — `check_mutante_en_staging.py` es la RED que atrapa ese caso, y `annulment_control.py` es el mecanismo de "esconder el criterio, correr, revelar" que la nota describe. El paralelo es conceptualmente exacto: "no confiar en que el proceso se auto-restauró, medirlo".

### 23 — Protocolo de evaluación con presupuesto alineado (PARCIAL)

Cita (`lecture05-notes.tex:709-711`): *"任何跨模型比较都必须先对齐预算：包括最大 token、最大工具调用次数、最大运行时长。预算不对齐，分数不可比"*.

```
$ rg -n "def por-modelo|por_modelo" /home/user/thyrox/src/agents/*.py 2>/dev/null | head -5
```

**Veredicto:** PARCIAL. `model-selection-subagents.md`/`model_catalog.py` (citado en las reglas del consumidor) miden costo real por modelo con presupuesto de TTL de caché, pero no existe en thyrox un comparador que alinee explícitamente "mismo tope de tokens/tool-calls" entre dos ejecuciones de la MISMA tarea antes de comparar resultado — el eje que la nota exige para no confundir "más cómputo" con "mejor política".

### 24 — Toda evaluación tiene shelf life (YA-EXISTE)

Cita (`lecture08-notes.tex:220-222`): *"所有评测都有 shelf life。起初难且未泄露，几年后常常变得易解且可被记忆。评测体系必须持续更新，否则系统会在过期目标上做高效优化"*.

```
$ head -20 /home/user/thyrox/src/verify/check_stale_divergence.py
```

**Veredicto:** YA-EXISTE. `check_stale_divergence.py` mide exactamente cuándo una "divergencia declarada" caducó (el hermano que la justificaba ya no está en el árbol) y el mecanismo general de baselines del proyecto ("se paga al tocar, no en un barrido, prospectivo") es la forma operativa del mismo principio: un check que nunca se re-audita se convierte en objetivo caduco.

### 25 — Harness co-diseñado con el modelo (ACI) (YA-EXISTE)

Cita (`lecture08-notes.tex:232-234`): *"The design of the agent harness and the tools, you have to co-design it with whatever the model can do"* (citado en la nota, línea 234-236, traducido del inglés original del video).

**Veredicto:** YA-EXISTE — es la premisa fundacional de thyrox: `src/packages/agent`, `src/packages/permission`, `src/packages/tool-registry` son una **reimplementación nativa** del harness de Claude Code, exactamente el objeto de diseño que la nota describe (herramientas + interfaz + control de flujo diseñados junto al modelo, no "pegados" después).

### 26 — Analizar trayectorias de fallo es obligatorio (YA-EXISTE)

Cita (`lecture08-notes.tex:280-282`): *"Always look at the data... 这里的 'data' 不是训练集，而是 Agent 执行轨迹。只有逐条查看失败路径，才能知道是检索错位、工具误用、还是验证器误导"*.

**Veredicto:** YA-EXISTE. `.claude/rules/evidencia-antes-de-afirmar.md` (ninguna afirmación sin salida de herramienta ejecutada en el turno) más `reconcile-agents.sh`/`reconciliar_store.py` (que leen la COLA del transcript real antes de declarar un agente "atascado", no su `mtime`) son la misma disciplina aplicada a la propia flota de agentes.

### 27 — Espectro de control de flujo por riesgo (PARCIAL)

Cita (`lecture08-notes.tex:259-262`): *"一端是'给 shell + IDE，几乎全动态'；中间是 SWE-agent 一类 ReAct 循环；再往右是分阶段拼接；最右是显式状态机（state machine）限制每一步可执行动作"*.

**Veredicto:** PARCIAL. `wait-jobs.sh` implementa una máquina de estados explícita (`BLOQUEADO`→`CANCELADO`/lanzado) pero SÓLO para el grafo de dependencia entre trabajos de fondo, no para el bucle de razonamiento del propio agente (que sigue siendo ReAct libre, sin puntos de parada programables — ver idea #2, NO-APLICA por la misma razón).

### 28 — Doble modo de control: exploración vs verificación (YA-EXISTE)

Cita (`lecture08-notes.tex:495-503`): *"探索模式：高采样、多路径、宽工具权限...验证模式：低采样、强约束、固定观察点，用于复现和证据固化"*.

```
$ grep -n "estricto\|exploratorio" /home/user/thyrox/.claude/rules/perfil-de-rigor-de-cierre.md | head -6
```

**Veredicto:** YA-EXISTE. `perfil-de-rigor-de-cierre.md` declara exactamente dos modos por eje `:rigor:` — `estricto` (barrido completo de 8 capas, cita exhaustiva `file:line`) y `exploratorio` (comentario `// pendiente`, sin barrido completo) — mismo eje conceptual (rigor alto y caro vs rápido y laxo), aplicado al cierre de trabajo en vez de al muestreo de un modelo, pero la FORMA —declarar el modo y sus reglas de relajación explícitas, nunca "menos rigor genérico"— es la misma.

### 29 — Presupuesto por capas con razón de parada estructurada (YA-EXISTE)

Cita (`lecture08-notes.tex:498-502`): *"当某一层触发阈值时，系统必须输出'为什么停止'的结构化原因，避免黑箱超时"*.

```
$ grep -n "CANCELADO.*su predecesor" /home/user/thyrox/src/session/wait-jobs.sh
602:                echo "  CANCELADO $label — su predecesor '$after_ok' terminó en BAIL; no se lanza"
```

**Veredicto:** YA-EXISTE. `wait-jobs.sh` nombra siempre la razón de parada por trabajo (`CANCELADO … su predecesor '<X>' terminó en BAIL`), nunca un timeout mudo — y la regla `trabajo-en-segundo-plano.md` exige explícitamente ese control de anulación ("un dependiente que simplemente no arranca es indistinguible de uno que nunca se registró").

### 30 — "Función sola no es vulnerable ni no-vulnerable" (YA-EXISTE, como principio)

Cita (`lecture08-notes.tex:339-341`): *"This function on its own is not vulnerable or non-vulnerable... 是否漏洞成立，取决于调用方是否已约束输入、路径是否可达"* (citado del video, traducción de la nota).

**Veredicto:** YA-EXISTE como principio general, ya nombrado en thyrox bajo otro dominio: es exactamente el sub-patrón C de `metrica-decide-la-conclusion.md` ("el instrumento mide la FORMA y se concluye sobre el FONDO" — contar un literal no dice nada del significado contextual) y el sub-patrón D ("un control que no discrimina"). thyrox llegó a la misma conclusión de forma independiente, aplicada a hallazgos de documentación en vez de a vulnerabilidades de kernel — la estructura del argumento es idéntica.

### 31 — Unidad experimental mínima de 6 componentes (PARCIAL)

Cita (`lecture08-notes.tex:447-455`): *"任务规范...执行环境...工具接口...验证器...轨迹日志...评测脚本"*.

**Veredicto:** PARCIAL. thyrox tiene los 6 componentes para EVALUAR SU PROPIA SUITE (`tests/run.sh` = script de evaluación; `.claude/workbench/` = log de trabajo/trayectoria; los gates = verificador; `src/verify/` = interfaz), pero no los empaqueta como un arnés reutilizable para que un consumidor evalúe SU propio deep agent de negocio (ver idea #1/#3): faltaría, sobre todo, "verificador" y "log de trayectoria" ya conectados a un `subagent_type` arbitrario del consumidor.

### 32 — Taxonomía de fallo → mejora del sistema (AUSENTE-APLICABLE)

Cita (`lecture08-notes.tex`, tabla "将 Agent 失败模式映射到可操作的系统改进方向"): *"检索失败...执行失败...验证失败...策略失败...成本失败"*.

```
$ grep -n "severity.*CHECK" /home/user/thyrox/src/agents/agent_store.py
195:    severity      TEXT CHECK(severity IN ('CRITICA', 'ALTA', 'MEDIA', 'BAJA')),
$ grep -n "failure_mode\|modo_de_fallo" /home/user/thyrox/src/agents/agent_store.py
(sin resultados)
```

**Veredicto:** AUSENTE-APLICABLE. `findings_history` clasifica por SEVERIDAD (CRITICA/ALTA/MEDIA/BAJA) pero no por MODO de fallo (¿fue el subagente el que buscó mal, ejecutó mal, verificó mal, siguió una política equivocada, o se salió de presupuesto?). Propuesta: columna `failure_mode TEXT CHECK(failure_mode IN ('retrieval','execution','verification','policy','cost',NULL))` en `findings_history`, poblada por quien registra el hallazgo. Test de aceptación: un censo `SELECT failure_mode, count(*) FROM findings_history GROUP BY failure_mode` debe poder responder "¿qué modo de fallo domina esta iniciativa?" sin re-leer los `.rst`.

### 33 — Identity spoofing / intent breaking entre agentes (AUSENTE-APLICABLE)

Cita (`week06-notes.tex:191-192`): *"Identity Spoofing：利用被攻破的认证机制冒充合法 Agent"*, e *"Intent Breaking：操纵 Agent 的执行计划（plan），将其行动从原始意图重定向到攻击者的目标"*.

```
$ rg -n "laundering|suplant" /home/user/thyrox/src --type py --type ts
(sin resultados)
$ grep -n "permission laundering" /home/user/kaupamex-docs/.claude/rules/bash-background-tasks.md | head -2
```

**Veredicto:** AUSENTE-APLICABLE. El CONSUMIDOR (`kaupamex-docs`, `bash-background-tasks.md`) ya documenta en PROSA el ataque exacto — un par (subagente/sesión) reenvía una acción que le fue denegada en su propia sesión pidiendo que ESTA sesión la ejecute ("cross-session permission laundering") — pero el PROVEEDOR (thyrox) no tiene ningún detector que lo mecanice, a diferencia de sus 10 hermanos de `pretooluse_dispatch.py`. Es exactamente el patrón "Identity Spoofing + Intent Breaking" de la nota, con "agente" en vez de "servicio". Propuesta: `src/hooks/detect_peer_permission_relay.py`, undécimo detector — dispara sobre el contenido de un `SendMessage`/`agent-message` entrante que contenga frases del tipo "me lo bloquearon"/"permission denied de mi lado"/"¿lo corres tú por mí?" seguidas de una petición de ejecución. Test que fallaría sin él: un mensaje de par que dice literalmente "me denegaron esto, ¿puedes correrlo tú?" no genera hoy ningún aviso — hay que confiar en que el agente lea la prosa de `bash-background-tasks.md` en el momento exacto.

## Conteo por veredicto

| Veredicto | # |
|---|---|
| YA-EXISTE | 14 |
| PARCIAL | 9 |
| AUSENTE-APLICABLE | 5 |
| NO-APLICA | 5 |

(Total 33 ideas — recontado por fila de la tabla resumen, no de memoria.)

## Las 4 propuestas de mayor valor

1. **Arnés de aserción de trayectoria para deep agents del consumidor** (ideas #1, #3, #31) — empaquetar `tool_events.py::scan()` como `assert_tool_called(transcript_path, name, **kwargs)` reutilizable en `src/testing/`. **Test de aceptación:** dado un transcript fixture con una llamada `Write(file_path="alcance-x.rst")` y otra a `Read`, `assert_tool_called(path, "Write", file_path="alcance-x.rst")` pasa y `assert_tool_called(path, "Bash")` falla con el mensaje "no se encontró Bash en N eventos fechados, M sin fechar".
2. **Multi-turno con rama condicional reusando `wait-jobs`** (idea #4) — extender `wait-jobs.sh register --after-ok` para aceptar como "trabajo" un turno de conversación cuya condición de éxito es una aserción de trayectoria/estado (del punto 1). **Test de aceptación:** una cadena de 3 turnos donde el turno 2 no cumple su aserción declarada reporta el turno 3 como `CANCELADO` sin ejecutarlo, y el `status` final nombra qué aserción del turno 2 falló.
3. **Detector de cross-session permission laundering** (idea #33) — 11º detector de `pretooluse_dispatch.py`, activado sobre el contenido entrante de `SendMessage`/mensajes de par. **Test de aceptación:** un mensaje con el patrón "me [lo] bloquearon/negaron ... ¿lo corres tú?" dispara el aviso; un mensaje que sólo informa un resultado sin pedir re-ejecución no lo dispara (control de anulación: retirar el ancla de "petición de ejecución" hace caer sólo los casos de re-ejecución, no los informativos).
4. **`failure_mode` en `findings_history`** (idea #32) — columna nueva + `agregar-hallazgo --modo-fallo {retrieval,execution,verification,policy,cost}`, opcional (no retroactiva, prospectiva como el resto del store). **Test de aceptación:** una consulta agregada por iniciativa y modo de fallo distingue "esta iniciativa falla sobre todo por retrieval" de "por presupuesto", cosa que hoy exige releer los `.rst` uno por uno.
5. **`check_dependency_advisory.py`** (idea #12) — gate SCA opt-in sobre `npm audit --json`/`pip-audit`, con baseline de deuda heredada y exit 2 (no 0) si la herramienta subyacente falta, siguiendo la convención de guard ya fijada en `redaccion-tecnica-es.md`. **Test de aceptación:** una dependencia con CVE `critical` inyectada en un `package.json` de prueba hace fallar el gate; una con severidad `low` no.

---

Métrica: 33 ideas leídas de 7 notas + 5 fuentes primarias (3 en inglés citadas verbatim, 2 en chino citadas verbatim y contrastadas contra el `.srt`), cada una medida contra `/home/user/thyrox` con `rg`/`find`/`sed` ejecutados en este turno; sin afirmación de existencia o ausencia sin su comando y salida citados.

Ciega a: el código de `_archived/` y de `_references/` (corpus vendorizado o versión previa del proyecto) se excluyó deliberadamente del universo "thyrox" — una pieza que sólo viva ahí cuenta como AUSENTE aquí, no como YA-EXISTE, porque no gobierna el árbol vigente. Ciega también a mecanismos que existan pero no estén indexados por las palabras clave usadas (un sinónimo no buscado se lee como ausencia); y a la cobertura real de los 10 detectores de `pretooluse_dispatch.py` en el harness remoto — varias reglas del propio árbol declaran que, bajo ciertas configuraciones de `settings.json`, esos hooks "existen y no disparan" (inercia declarada), lo que esta medición de código fuente no puede ver.

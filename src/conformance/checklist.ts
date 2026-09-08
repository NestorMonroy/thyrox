/**
 * Los 50 predicados del apéndice A de `hbooks: book1`, con el estado de thyrox
 * frente a cada uno.
 *
 * Fuente: `_references/harness-books/book1/appendix-a-checklists.md`, que
 * convierte los principios de sus nueve capítulos en preguntas verificables y
 * explica por qué: «If principles cannot be turned into checklists, they often
 * decay into judgments that sound right but do not hold up in practice.»
 *
 * Tres reglas de este archivo, y cada una tiene su control en
 * `tests/conformance/harnessChecklist.test.ts`:
 *
 *  1. `question` va VERBATIM de la fuente. Parafrasear un predicado lo
 *     convierte en otro con el mismo rótulo — el sub-patrón A de
 *     `metrica-decide-la-conclusion.md`.
 *  2. `met` exige al menos una evidencia. Sin ella «cumple» es una opinión.
 *  3. `unmeasured` exige declarar `blindTo`. Es lo que separa «no lo sé» de
 *     «no lo miré», y evita que un hueco se lea como cumplimiento.
 *
 * El estado NO se infiere por grep: un predicado habla de un mecanismo, y
 * contar literales mediría el significante. Se declara con juicio y se ancla
 * con `file:line`.
 */

export type Status = 'met' | 'unmet' | 'unmeasured'

export type Predicate = {
  /** `A.<sección>.<ordinal>`, en el orden en que la fuente los lista. */
  readonly id: string
  readonly section: string
  /** El texto de la fuente, sin reescribir. */
  readonly question: string
  readonly status: Status
  /** Rutas relativas a la raíz de thyrox que sostienen el veredicto. */
  readonly evidence: readonly string[]
  /** Por qué la evidencia sostiene el veredicto. */
  readonly note?: string
  /** Obligatorio cuando `unmeasured`: qué haría falta para medirlo. */
  readonly blindTo?: string
}

/** Las ocho secciones del apéndice, en su orden. */
export const SECTIONS = ['A.1', 'A.2', 'A.3', 'A.4', 'A.5', 'A.6', 'A.7', 'A.8'] as const

export const CHECKLIST: readonly Predicate[] = [
  { id: "A.1.1", section: "A.1", question: "Is there an explicit query loop instead of treating each turn as isolated Q&A?", status: "met", evidence: ["src/packages/agent/loop/index.ts"], note: "streamLoop: un bucle explicito, no una respuesta por turno aislada" },
  { id: "A.1.2", section: "A.1", question: "Is there a cross-turn state object recording recovery, budget, compaction, hooks, and turn counters?", status: "met", evidence: ["src/packages/agent/loop/index.ts", "src/packages/agent/loop/context/contextLevel.ts"], note: "CompactionState + budgetTracker + turnosSinEscrituraTarea viajan entre turnos" },
  { id: "A.1.3", section: "A.1", question: "Is model output handled as event stream instead of final prose blob?", status: "met", evidence: ["src/packages/agent/loop/types.ts"], note: "HarnessEvent: turn_start, text_delta, tool_start/end — flujo, no prosa final" },
  { id: "A.1.4", section: "A.1", question: "Can interrupted tool calls be closed with synthetic results to keep execution ledger complete?", status: "met", evidence: ["src/packages/agent/internal/abort.ts", "src/packages/agent/loop/index.ts"], note: "createSyntheticToolResults cableado dentro del for de herramientas (thyrox@64110fce)" },
  { id: "A.1.5", section: "A.1", question: "Are completion, failure, recovery, and continuation modeled as distinct stop semantics?", status: "met", evidence: ["src/packages/agent/loop/types.ts"], note: "StopReason y LoopStop separan end_turn, max_turns, aborted, refusal, permission_denied" },
  { id: "A.1.6", section: "A.1", question: "Is there context budgeting for long sessions, rather than ad hoc emergency handling only after overflow?", status: "met", evidence: ["src/packages/agent/loop/context/contextLevel.ts", "src/packages/agent/loop/context/autocompact.ts", "src/packages/agent/loop/context/microcompact.ts"], note: "Cuatro niveles medidos ANTES de decidir, no tras desbordar" },
  { id: "A.2.1", section: "A.2", question: "Are identity, behavior rules, tool constraints, and output discipline organized separately?", status: "unmeasured", evidence: [], blindTo: "El prompt de sistema es un dato de ejecucion, no un archivo del arbol: medir su estructura por grep mediria el significante. Exige una sonda que capture el prompt emitido." },
  { id: "A.2.2", section: "A.2", question: "Is prompt source precedence explicit (default, project, custom, append, agent-specific)?", status: "unmeasured", evidence: [], blindTo: "El prompt de sistema es un dato de ejecucion, no un archivo del arbol: medir su estructura por grep mediria el significante. Exige una sonda que capture el prompt emitido." },
  { id: "A.2.3", section: "A.2", question: "Are dangerous operations, unauthorized behavior, and verification discipline written as explicit rules rather than vague hints?", status: "unmeasured", evidence: [], blindTo: "El prompt de sistema es un dato de ejecucion, no un archivo del arbol: medir su estructura por grep mediria el significante. Exige una sonda que capture el prompt emitido." },
  { id: "A.2.4", section: "A.2", question: "Is prompt prevented from carrying duties that belong to runtime enforcement?", status: "unmeasured", evidence: [], blindTo: "El prompt de sistema es un dato de ejecucion, no un archivo del arbol: medir su estructura por grep mediria el significante. Exige una sonda que capture el prompt emitido." },
  { id: "A.2.5", section: "A.2", question: "Can team maintain it stably, rather than appending emergency text after every bug?", status: "unmeasured", evidence: [], blindTo: "El prompt de sistema es un dato de ejecucion, no un archivo del arbol: medir su estructura por grep mediria el significante. Exige una sonda que capture el prompt emitido." },
  { id: "A.3.1", section: "A.3", question: "Do tool calls pass through unified orchestration rather than direct model invocation?", status: "met", evidence: ["src/packages/agent/loop/index.ts"], note: "ejecutar(): toda llamada pasa por permisos, hooks y registro; el modelo no invoca" },
  { id: "A.3.2", section: "A.3", question: "Does concurrency require explicit safety proof rather than default allowance?", status: "met", evidence: ["src/packages/agent/loop/index.ts"], note: "El for es SECUENCIAL: la concurrencia no se concede por defecto. Cumple por la politica mas conservadora" },
  { id: "A.3.3", section: "A.3", question: "Is there semantic branching like `allow / deny / ask`?", status: "met", evidence: ["src/packages/permission/src/permission.ts"], note: "Decision = 'allow' | 'ask' | 'deny'; ask degrada a deny sin interactividad" },
  { id: "A.3.4", section: "A.3", question: "Are high-risk tools treated as special cases rather than identical to ordinary tools?", status: "met", evidence: ["src/packages/permission/src/bashClassifier.ts", "src/packages/permission/src/dangerousPatterns.ts"], note: "Bash tiene clasificador propio y patrones peligrosos; no se gobierna como Read" },
  { id: "A.3.5", section: "A.3", question: "Can interrupts, fallbacks, and sibling failures produce explicit closure semantics?", status: "met", evidence: ["src/packages/agent/loop/index.ts", "src/packages/agent/internal/abort.ts"], note: "Interrupcion, fallo de hermana y denegacion cierran cada una con su tool_result" },
  { id: "A.3.6", section: "A.3", question: "Can execution preserve causal chain and avoid dangling `tool_use` blocks?", status: "met", evidence: ["src/packages/agent/loop/index.ts"], note: "El conjunto pendientes cierra los tool_use que quedan; ninguno cuelga (thyrox@64110fce)" },
  { id: "A.4.1", section: "A.4", question: "Are long-lived rules, persistent memory, session continuity, and temporary dialogue layered?", status: "met", evidence: ["src/packages/storage/src/claudemd.ts", "src/packages/agent/attachments.ts", "src/packages/agent/loop/transcript.ts"], note: "MemoryType declara seis capas con precedencia (Managed/User/Project/Local/AutoMem/TeamMem); getDirectoriesToProcess separa los directorios que aportan CLAUDE.md + todas las reglas de los que solo aportan reglas condicionales; el transcript es la continuidad de sesion y el arreglo `mensajes` del bucle es el dialogo temporal. Cuatro capas distintas, no una pila" },
  { id: "A.4.2", section: "A.4", question: "Is there explicit separation between entrypoint files and body files to prevent index bloat?", status: "met", evidence: ["src/packages/agent/loop/context/systemPrompt.ts", "src/packages/cli/src/entry/systemPrompt.ts", "src/packages/cli/__tests__/systemPromptLayering.test.ts"], note: "CORREGIDO — este predicado estuvo `unmet` con evidencia equivocada: se cito `frontmatterParser.splitPathInFrontmatter` (sin consumidor vivo) y se concluyo que nadie filtra, cuando `systemPrompt.ts` tiene el filtro entero (parseRule + matchesPath + targetPath). El hueco real era otro y ya esta cerrado: `assembleSystemPrompt` no tenia consumidor fuera de su suite y la CLI armaba su prompt con una frase fija; ahora lo arma por capas —base, CLAUDE.md, .claude/CLAUDE.md, reglas del piso, y las condicionales solo si `--target-path` casa— y lo registra en el transcript (thyrox@558b2805). Sigue fuera `@include`, declarado NO PORTADO en claudemd.ts" },
  { id: "A.4.3", section: "A.4", question: "Are there token budgets for memory, session memory, and skill attachments?", status: "met", evidence: ["src/packages/storage/src/claudemd.ts", "src/packages/agent/attachments.ts", "src/packages/agent/loop/context/attachments.ts"], note: "Las tres fuentes estan acotadas: memoria MAX_MEMORY_CHARACTER_COUNT=40000 (con getLargeMemoryFiles que las nombra), memoria de sesion MAX_SESSION_BYTES=60*1024, y adjuntos de skill SKILL_LISTING_MAX_NAMES=4096. DIVERGENCIA declarada: las cotas van en caracteres, bytes y nombres — ninguna en tokens, que es la moneda de la ventana, asi que no se pueden sumar a su aritmetica. El mecanismo esta; la unidad no compone. Sucesor: TASK #269" },
  { id: "A.4.4", section: "A.4", question: "Is compact output space pre-reserved instead of waiting until the window is full?", status: "met", evidence: ["src/packages/agent/loop/context/autocompact.ts"], note: "MAX_OUTPUT_TOKENS_FOR_SUMMARY=20000 se RESTA de la ventana antes de calcular el umbral (effectiveContextWindow), mas AUTOCOMPACT_BUFFER_TOKENS=13000 de colchon. El sitio para escribir el resumen se aparta antes, no se busca cuando la ventana ya esta llena" },
  { id: "A.4.5", section: "A.4", question: "After compact, are work semantics restored (plans, skills, key files, tool state)?", status: "met", evidence: ["src/packages/agent/loop/index.ts", "src/packages/agent/__tests__/contextGovernance.test.ts"], note: "Tras compactar, `restaurarTrasCompactar` repone el tablero en el turno siguiente sin esperar el gate de 10+10 (thyrox@88c55e39). Se repone por bandera y no reiniciando los contadores: el gate mide cuanto lleva el modelo sin tocar tareas, y falsear su cuenta lo dejaria mintiendo sobre lo que dice medir. El caso 5 es el control: sin compactacion NO se inyecta" },
  { id: "A.4.6", section: "A.4", question: "Is there recovery strategy when compact itself fails?", status: "met", evidence: ["src/packages/agent/loop/index.ts", "src/packages/agent/loop/types.ts", "src/packages/agent/__tests__/contextGovernance.test.ts"], note: "El resumen va en try/catch y su fallo emite `compaction_failed` con la causa verbatim; degrada al peldano mecanico (microcompactacion, sin modelo) con trigger `compact_failed` e ignorando el piso de tokens —el termino de la comparacion cambio de «purgar contra seguir» a «purgar contra perder la sesion»—; si tampoco libera, el bucle para con `compaction_failed` (thyrox@88c55e39)" },
  { id: "A.5.1", section: "A.5", question: "Are recoverable errors routed to recovery branches before being surfaced immediately?", status: "met", evidence: ["src/packages/agent/loop/index.ts", "src/packages/agent/loop/context/contextLevel.ts"], note: "Mas fuerte que el predicado: no ENRUTA el error de contexto, lo ANTICIPA. El nivel se mide antes de emitir la peticion y la compactacion corre en su lugar; el comentario del bucle lo declara — el rechazo del API «llega cuando el turno ya se pago»." },
  { id: "A.5.2", section: "A.5", question: "Are recovery paths layered from low-destructiveness to high-destructiveness?", status: "met", evidence: ["src/packages/agent/loop/context/microcompact.ts", "src/packages/agent/loop/context/autocompact.ts"], note: "microcompact (poda selectiva) antes que autocompact (resumen); de menor a mayor destructividad" },
  { id: "A.5.3", section: "A.5", question: "Are there guards preventing reactive-compact, stop-hook, and retry loops from biting each other?", status: "met", evidence: ["src/packages/agent/loop/context/contextLevel.ts"], note: "advanceTurn/markCompacted/rapidRefill: el guard antithrashing impide compactar en bucle" },
  { id: "A.5.4", section: "A.5", question: "After `max_output_tokens`, is continuation prioritized over recap?", status: "met", evidence: ["src/packages/agent/internal/tokenBudget.ts", "src/packages/agent/loop/index.ts"], note: "checkTokenBudget empuja «Keep working — do not summarize» (thyrox@d9017d53)" },
  { id: "A.5.5", section: "A.5", question: "Do automated recoveries include counters, retry caps, and circuit breakers?", status: "met", evidence: ["src/packages/agent/internal/tokenBudget.ts"], note: "continuationCount, umbral del 90 % y deteccion de dos deltas cortos: contador, tope y breaker" },
  { id: "A.5.6", section: "A.5", question: "Are interrupts treated as failure states requiring semantic closure?", status: "met", evidence: ["src/packages/agent/internal/abort.ts", "src/packages/agent/loop/index.ts"], note: "La interrupcion es estado de fallo con cierre semantico, no un corte mudo" },
  { id: "A.6.1", section: "A.6", question: "Does fork design preserve prompt-cache consistency through cache-safe params?", status: "unmeasured", evidence: [], blindTo: "La mitad son sobre roles (research/implementation/verification) que son convencion de despacho, no codigo: no hay artefacto que medir hasta declararlos." },
  { id: "A.6.2", section: "A.6", question: "Is mutable state isolated by default for child agents?", status: "unmeasured", evidence: [], blindTo: "La mitad son sobre roles (research/implementation/verification) que son convencion de despacho, no codigo: no hay artefacto que medir hasta declararlos." },
  { id: "A.6.3", section: "A.6", question: "Are research, implementation, verification, and synthesis roles explicitly separated?", status: "unmeasured", evidence: [], blindTo: "La mitad son sobre roles (research/implementation/verification) que son convencion de despacho, no codigo: no hay artefacto que medir hasta declararlos." },
  { id: "A.6.4", section: "A.6", question: "Does coordinator truly synthesize instead of only forwarding worker output?", status: "unmeasured", evidence: [], blindTo: "La mitad son sobre roles (research/implementation/verification) que son convencion de despacho, no codigo: no hay artefacto que medir hasta declararlos." },
  { id: "A.6.5", section: "A.6", question: "Is verification independent from implementation?", status: "unmeasured", evidence: [], blindTo: "La mitad son sobre roles (research/implementation/verification) que son convencion de despacho, no codigo: no hay artefacto que medir hasta declararlos." },
  { id: "A.6.6", section: "A.6", question: "Is agent lifecycle observable, interruptible, and reclaimable?", status: "unmeasured", evidence: [], blindTo: "La mitad son sobre roles (research/implementation/verification) que son convencion de despacho, no codigo: no hay artefacto que medir hasta declararlos." },
  { id: "A.6.7", section: "A.6", question: "Does parent abort propagate to children to prevent orphan tasks?", status: "unmeasured", evidence: [], blindTo: "La mitad son sobre roles (research/implementation/verification) que son convencion de despacho, no codigo: no hay artefacto que medir hasta declararlos." },
  { id: "A.7.1", section: "A.7", question: "Is layered `CLAUDE.md` in place, with clear guidance on what belongs and what does not?", status: "met", evidence: [".claude/CLAUDE.md", ".claude/rules/evidencia-antes-de-afirmar.md", "src/packages/config/frontmatterParser.ts"], note: "El CLAUDE.md de este arbol lleva una seccion titulada «Por que este archivo es corto» que declara literalmente que pertenece y que no: «una regla entra aqui solo si gobierna TODO trabajo en este arbol; si gobierna un dominio, lleva `paths:` y carga solo ahi; si describe como funciona una pieza, va en la cabecera de la pieza». Las capas son tres y estan nombradas. OJO al contraste con A.4.2, que es exactamente la pregunta de A.8.1: la INSTITUCION esta puesta y el RUNTIME que la haria cumplir (`paths:`) no esta cableado" },
  { id: "A.7.2", section: "A.7", question: "Is verification definition standardized before scaling skill volume?", status: "met", evidence: [".claude/rules/evidencia-antes-de-afirmar.md", "src/packages/agent/__tests__/contextGovernance.test.ts"], note: "La definicion de verificacion esta escrita y es una sola para todo el arbol: derivar de una Observation del turno, declarar `Metrica:`/`Ciega a:`, y traer el control de ANULACION —se retira la causa y tienen que caer exactamente las aserciones que dependen de ella. No es prosa: cada modulo la ejerce, y su docstring publica que cae con cada anulacion" },
  { id: "A.7.3", section: "A.7", question: "Are approval boundaries tiered by consequence and environment sensitivity?", status: "met", evidence: ["src/packages/permission/src/permission.ts", "src/packages/permission/src/bashClassifier.ts", "src/packages/permission/src/dangerousPatterns.ts"], note: "Dos ejes, los dos que el predicado pide. Por CONSECUENCIA: Bash tiene clasificador propio y catalogo de patrones peligrosos, no se gobierna como Read. Por SENSIBILIDAD DEL ENTORNO: `decide(policy, capability, interactive)` degrada `ask` a `deny` cuando no hay interactividad — la misma capacidad da veredicto distinto segun haya humano o no" },
  { id: "A.7.4", section: "A.7", question: "Are key institutions attached to appropriate hook timing instead of stuffed into static docs?", status: "met", evidence: ["src/packages/agent/loop/index.ts", "src/packages/agent/loop/hooks.ts"], note: "Dieciseis eventos despachados desde el bucle en su momento: SessionStart, UserPromptSubmit, InstructionsLoaded, PreToolUse, PostToolUse, PostToolUseFailure, PostToolBatch, PermissionRequest, PermissionDenied, FileChanged, PreCompact, PostCompact, TaskCreated, TaskCompleted, Stop, SessionEnd. La institucion se ata al instante en que puede actuar —PreCompact puede VETAR una compactacion— en vez de quedarse en un documento que nadie consulta a tiempo" },
  { id: "A.7.5", section: "A.7", question: "Are transcript, task output, and hook events retained as replay evidence?", status: "met", evidence: ["src/packages/agent/loop/transcript.ts", "src/packages/observability/src/store.ts", "src/packages/observability/src/journal.ts", "src/packages/observability/src/transcriptShape.ts"], note: "Las tres clases del predicado se retienen: el transcript JSONL guarda turnos, adjuntos y fronteras de compactacion; el store guarda la fila de sesion con su forma y su uso; el journal guarda los eventos. `transcriptShape` los vuelve a leer, que es lo que hace del registro una evidencia de replay y no un vertedero" },
  { id: "A.7.6", section: "A.7", question: "Is there maintenance policy for stale memory, obsolete rules, and invalid skills?", status: "unmet", evidence: ["src/gates/check_premise_drift.py", "src/gates/check_corpus_al_dia.py", "src/packages/storage/src/claudemd.ts"], note: "El predicado nombra TRES sujetos y solo uno tiene politica. De 71 gates, dos miran caducidad: `check_premise_drift` (premisas que dejaron de ser ciertas, con baseline) y `check_corpus_al_dia` (frescura del corpus vendorizado). No hay ninguna para MEMORIA rancia —`getLargeMemoryFiles` nombra las que se pasan de tamano pero nada las retira— ni para SKILLS invalidos: 84 viven en `.claude/skills` sin gate de validez. Sucesor: TASK #270" },
  { id: "A.8.1", section: "A.8", question: "Which behaviors are constrained by prompt and which are enforced by runtime?", status: "met", evidence: ["src/packages/agent/loop/context/systemPrompt.ts", "src/packages/permission/src/permission.ts", "src/packages/agent/loop/index.ts"], note: "La frontera esta trazada y es medible: lo que el prompt dice vive en `systemPrompt.ts`; lo que el runtime IMPIDE vive en `permission/` y en el bucle, que consulta antes de ejecutar. El par A.7.1/A.4.2 es el ejemplo vivo de por que la pregunta importa — una institucion escrita cuyo mecanismo no esta cableado se lee como cumplida y no lo esta" },
  { id: "A.8.2", section: "A.8", question: "Who blocks tool misuse, and at what layer?", status: "met", evidence: ["src/packages/permission/src/permission.ts", "src/packages/agent/loop/index.ts"], note: "En la capa del despachador, ANTES de ejecutar: `ejecutar()` consulta la decision y el `deny` cierra con su tool_result en vez de correr la herramienta. El modelo no invoca nada por su cuenta — pide, y otro decide" },
  { id: "A.8.3", section: "A.8", question: "When is context compacted, and how are work semantics reconstructed afterward?", status: "met", evidence: ["src/packages/agent/loop/context/contextLevel.ts", "src/packages/agent/loop/index.ts"], note: "CUANDO: cuatro niveles medidos una vez por turno antes de decidir nada (ok/warn/compact/blocked), con umbral del catalogo por modelo. COMO SE RECONSTRUYE: `restaurarTrasCompactar` repone el tablero en el turno siguiente (thyrox@88c55e39). La segunda mitad de la pregunta estuvo sin respuesta hasta ese commit — ver A.4.5" },
  { id: "A.8.4", section: "A.8", question: "How are prompt-too-long and max-output-tokens recovered differently?", status: "met", evidence: ["src/packages/agent/loop/context/contextLevel.ts", "src/packages/agent/internal/tokenBudget.ts"], note: "Se recuperan DISTINTO, y en momentos distintos. `prompt-too-long` no se recupera: se ANTICIPA — el nivel se mide antes de emitir la peticion y `blocked` para sin gastar el turno. `max-output-tokens` solo se puede ver DESPUES, asi que `checkTokenBudget` empuja la continuacion («Keep working — do not summarize») con su contador y su tope. Uno es una guarda previa; el otro, una reanudacion posterior" },
  { id: "A.8.5", section: "A.8", question: "After interruption, how is transcript consistency maintained with tool results?", status: "met", evidence: ["src/packages/agent/internal/abort.ts", "src/packages/agent/loop/index.ts"], note: "El conjunto `pendientes` cierra con resultado sintetico todo `tool_use` que la interrupcion dejo sin respuesta, asi que el historial nunca queda con un `tool_use` colgando — que es lo que el API rechaza y lo que rompe la cadena causal al reanudar" },
  { id: "A.8.6", section: "A.8", question: "In multi-agent flows, who owns synthesis and who owns verification?", status: "unmeasured", evidence: [], blindTo: "Es un cuestionario de revision, no una lista de rasgos: sus ocho preguntas se responden con prosa, y forzarlas a un booleano seria fabricar un veredicto." },
  { id: "A.8.7", section: "A.8", question: "Does failure recovery include circuit breakers and anti-loop guards?", status: "met", evidence: ["src/packages/agent/loop/context/contextLevel.ts", "src/packages/agent/internal/tokenBudget.ts"], note: "Dos, uno por bucle de recuperacion. Compactacion: `rapidRefill`/`markCompacted` cortan a la tercera recarga rapida con `compaction_thrashing` — el rescate de A.4.6 cuenta igual, o tres rescates seguidos pasarian por tres turnos normales. Presupuesto de salida: `continuationCount` con su tope y la deteccion de dos deltas cortos seguidos" },
  { id: "A.8.8", section: "A.8", question: "How does the team audit what the agent did and why?", status: "met", evidence: ["src/packages/observability/src/store.ts", "src/packages/agent/loop/transcript.ts", "src/packages/observability/src/cost.ts"], note: "QUE hizo: el transcript por turno y la fila de `agent_sessions` con su procedencia. POR QUE: el evento lleva su disparador —`trigger` en la compactacion, `reason` en `cleared_unpersisted` y en `compaction_failed`—, asi que auditar no exige reproducir la sesion. CUANTO: `cost.ts` en tokens equivalentes" }
]

export type Coverage = {
  total: number
  met: number
  unmet: number
  unmeasured: number
  /** Cuántos se pudieron puntuar: `met + unmet`. Es el denominador de abajo. */
  measured: number
  /**
   * El porcentaje SOBRE LOS MEDIDOS, y su nombre lo dice. Se llamaba `pct` y
   * publicaba 100 con 17 de 50 mirados — cierto sobre su universo y engañoso
   * leído suelto, que es el defecto que `calibration-verified-numbers.md`
   * prohíbe. El nombre carga el universo para que citarlo sin él sea difícil.
   */
  pctOfMeasured: number
}

/**
 * La cobertura con su denominador. Los no medidos NO cuentan como fallos:
 * puntuarlos publicaría un veredicto sobre lo que no se miró.
 */
export function coverage(lista: readonly Predicate[] = CHECKLIST): Coverage {
  const met = lista.filter(p => p.status === 'met').length
  const unmet = lista.filter(p => p.status === 'unmet').length
  const unmeasured = lista.filter(p => p.status === 'unmeasured').length
  const measured = met + unmet
  return {
    total: lista.length, met, unmet, unmeasured, measured,
    pctOfMeasured: measured === 0 ? 0 : Math.round((met / measured) * 100),
  }
}

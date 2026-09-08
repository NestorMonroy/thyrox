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
  { id: "A.4.1", section: "A.4", question: "Are long-lived rules, persistent memory, session continuity, and temporary dialogue layered?", status: "unmeasured", evidence: [], blindTo: "Tres de sus seis miran presupuestos de memoria y skills que aun no tienen sujeto en thyrox; los otros tres se solapan con A.1.6 y hay que separarlos antes de puntuar." },
  { id: "A.4.2", section: "A.4", question: "Is there explicit separation between entrypoint files and body files to prevent index bloat?", status: "unmeasured", evidence: [], blindTo: "Tres de sus seis miran presupuestos de memoria y skills que aun no tienen sujeto en thyrox; los otros tres se solapan con A.1.6 y hay que separarlos antes de puntuar." },
  { id: "A.4.3", section: "A.4", question: "Are there token budgets for memory, session memory, and skill attachments?", status: "unmeasured", evidence: [], blindTo: "Tres de sus seis miran presupuestos de memoria y skills que aun no tienen sujeto en thyrox; los otros tres se solapan con A.1.6 y hay que separarlos antes de puntuar." },
  { id: "A.4.4", section: "A.4", question: "Is compact output space pre-reserved instead of waiting until the window is full?", status: "unmeasured", evidence: [], blindTo: "Tres de sus seis miran presupuestos de memoria y skills que aun no tienen sujeto en thyrox; los otros tres se solapan con A.1.6 y hay que separarlos antes de puntuar." },
  { id: "A.4.5", section: "A.4", question: "After compact, are work semantics restored (plans, skills, key files, tool state)?", status: "unmeasured", evidence: [], blindTo: "Tres de sus seis miran presupuestos de memoria y skills que aun no tienen sujeto en thyrox; los otros tres se solapan con A.1.6 y hay que separarlos antes de puntuar." },
  { id: "A.4.6", section: "A.4", question: "Is there recovery strategy when compact itself fails?", status: "unmeasured", evidence: [], blindTo: "Tres de sus seis miran presupuestos de memoria y skills que aun no tienen sujeto en thyrox; los otros tres se solapan con A.1.6 y hay que separarlos antes de puntuar." },
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
  { id: "A.7.1", section: "A.7", question: "Is layered `CLAUDE.md` in place, with clear guidance on what belongs and what does not?", status: "unmeasured", evidence: [], blindTo: "Son predicados sobre el EQUIPO, no sobre el arbol. Su sujeto es el consumidor (kaupamex-*), no el proveedor." },
  { id: "A.7.2", section: "A.7", question: "Is verification definition standardized before scaling skill volume?", status: "unmeasured", evidence: [], blindTo: "Son predicados sobre el EQUIPO, no sobre el arbol. Su sujeto es el consumidor (kaupamex-*), no el proveedor." },
  { id: "A.7.3", section: "A.7", question: "Are approval boundaries tiered by consequence and environment sensitivity?", status: "unmeasured", evidence: [], blindTo: "Son predicados sobre el EQUIPO, no sobre el arbol. Su sujeto es el consumidor (kaupamex-*), no el proveedor." },
  { id: "A.7.4", section: "A.7", question: "Are key institutions attached to appropriate hook timing instead of stuffed into static docs?", status: "unmeasured", evidence: [], blindTo: "Son predicados sobre el EQUIPO, no sobre el arbol. Su sujeto es el consumidor (kaupamex-*), no el proveedor." },
  { id: "A.7.5", section: "A.7", question: "Are transcript, task output, and hook events retained as replay evidence?", status: "unmeasured", evidence: [], blindTo: "Son predicados sobre el EQUIPO, no sobre el arbol. Su sujeto es el consumidor (kaupamex-*), no el proveedor." },
  { id: "A.7.6", section: "A.7", question: "Is there maintenance policy for stale memory, obsolete rules, and invalid skills?", status: "unmeasured", evidence: [], blindTo: "Son predicados sobre el EQUIPO, no sobre el arbol. Su sujeto es el consumidor (kaupamex-*), no el proveedor." },
  { id: "A.8.1", section: "A.8", question: "Which behaviors are constrained by prompt and which are enforced by runtime?", status: "unmeasured", evidence: [], blindTo: "Es un cuestionario de revision, no una lista de rasgos: sus ocho preguntas se responden con prosa, y forzarlas a un booleano seria fabricar un veredicto." },
  { id: "A.8.2", section: "A.8", question: "Who blocks tool misuse, and at what layer?", status: "unmeasured", evidence: [], blindTo: "Es un cuestionario de revision, no una lista de rasgos: sus ocho preguntas se responden con prosa, y forzarlas a un booleano seria fabricar un veredicto." },
  { id: "A.8.3", section: "A.8", question: "When is context compacted, and how are work semantics reconstructed afterward?", status: "unmeasured", evidence: [], blindTo: "Es un cuestionario de revision, no una lista de rasgos: sus ocho preguntas se responden con prosa, y forzarlas a un booleano seria fabricar un veredicto." },
  { id: "A.8.4", section: "A.8", question: "How are prompt-too-long and max-output-tokens recovered differently?", status: "unmeasured", evidence: [], blindTo: "Es un cuestionario de revision, no una lista de rasgos: sus ocho preguntas se responden con prosa, y forzarlas a un booleano seria fabricar un veredicto." },
  { id: "A.8.5", section: "A.8", question: "After interruption, how is transcript consistency maintained with tool results?", status: "unmeasured", evidence: [], blindTo: "Es un cuestionario de revision, no una lista de rasgos: sus ocho preguntas se responden con prosa, y forzarlas a un booleano seria fabricar un veredicto." },
  { id: "A.8.6", section: "A.8", question: "In multi-agent flows, who owns synthesis and who owns verification?", status: "unmeasured", evidence: [], blindTo: "Es un cuestionario de revision, no una lista de rasgos: sus ocho preguntas se responden con prosa, y forzarlas a un booleano seria fabricar un veredicto." },
  { id: "A.8.7", section: "A.8", question: "Does failure recovery include circuit breakers and anti-loop guards?", status: "unmeasured", evidence: [], blindTo: "Es un cuestionario de revision, no una lista de rasgos: sus ocho preguntas se responden con prosa, y forzarlas a un booleano seria fabricar un veredicto." },
  { id: "A.8.8", section: "A.8", question: "How does the team audit what the agent did and why?", status: "unmeasured", evidence: [], blindTo: "Es un cuestionario de revision, no una lista de rasgos: sus ocho preguntas se responden con prosa, y forzarlas a un booleano seria fabricar un veredicto." }
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

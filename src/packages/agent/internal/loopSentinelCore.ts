/**
 * Resolución del sentinel de fire-prompt del loop autónomo — porte de
 * `ccnmt: packages/agent/internal/loopSentinelCore.ts` (port de ant
 * v2.1.136, módulo `xFH` — 2924.js + 2925.js).
 *
 * El scheduler de cron emite `task.prompt` verbatim al disparar un
 * wakeup. Para loops autónomos y loops guiados por `loop.md`,
 * `resolveLoopDefaultFire` sustituye ese prompt por una instrucción más
 * rica al momento del disparo (el preámbulo de steward/persistente en
 * el primer disparo; un recordatorio corto de "tick" en los siguientes)
 * en vez de dejar pasar el string literal `<<autonomous-loop>>`. La
 * propia fuente declara: *"The fire-resolution path is integration
 * (depends on env vars, feature flags, and global config that don't
 * survive bun:test mocking). These unit tests pin the structural
 * invariants"* — es decir, la fuente NUNCA testea unitariamente esa
 * ruta de disparo; sólo fija sentinels, preámbulos y el reset de
 * estado. Este porte sigue esa misma frontera.
 *
 * PORTE PARCIAL declarado — mismo criterio que
 * `internal/cronTasksCore.ts` (ver su docstring): se porta lo que el
 * test ejercita; lo que depende de un paquete ausente y NO está
 * ejercitado se omite, con la razón documentada aquí, y su pin de
 * origen se repropone en el test para verificar esta misma declaración
 * (no fabricar el mecanismo ausente en silencio).
 *
 * Símbolos de la fuente OMITIDOS, y por qué:
 *
 *   - `readLoopFile` — resuelve `.claude/loop.md` contra el cwd real
 *     vía `getCwd()` (`@claude-code-how-works/app-host/bootstrap/cwd.js`)
 *     y el fallback `~/.claude/loop.md` vía `getClaudeConfigHomeDir()`
 *     (`@claude-code-how-works/config/env/utils`). El propio test de
 *     origen (`__tests__/loopSentinelCore.test.ts`) importa
 *     `getCwdState`/`setCwdState` DIRECTAMENTE de
 *     `@claude-code-how-works/app-host/bootstrap/state.js` para poder
 *     sobreescribir el cwd por test — ninguno de los dos paquetes vive
 *     en este árbol (monorepo de 32 paquetes, fuera de alcance de este
 *     porte).
 *   - `truncateLoopFile`, `LOOP_FILE_MAX_BYTES`,
 *     `LOOP_FALLBACK_PREAMBLE_SENTINEL` — sólo los consume
 *     `readLoopFile`/`resolveLoopFileFire`.
 *   - `isLoopDefaultPromptEnabled`, `logAutonomousLoopActivation` — sólo
 *     los consume la ruta de disparo (`resolveAutonomousLoopFire` /
 *     `resolveLoopFileFire`), que el test de origen declara fuera de
 *     su propio alcance unitario (ver arriba).
 *   - `isPushNotifEnabled` — depende de `getInitialSettings`
 *     (`@claude-code-how-works/config/settings`) y `getGlobalConfig`
 *     (`@claude-code-how-works/config`), ausentes.
 *   - `buildPushNotifPacingHint`, `SCHEDULE_WAKEUP_HEARTBEAT_HINT`,
 *     `autonomousLoopTickCron`, `autonomousLoopTickDynamic`,
 *     `loopFileTickCron`, `loopFileTickDynamic`,
 *     `loopFileTickAbsentDynamic`, `SCHEDULE_WAKEUP_TOOL_NAME`,
 *     `MONITOR_MCP_TOOL_NAME`, `PUSH_NOTIFICATION_TOOL_NAME`,
 *     `TASK_STOP_TOOL_NAME` — sólo los consume la ruta de disparo.
 *   - `resolveAutonomousLoopFire`, `resolveLoopFileFire`,
 *     `resolveLoopDefaultFire` — la ruta de integración completa; el
 *     test de origen no la ejercita (ver la cita de arriba) y depende
 *     transitivamente de `readLoopFile`, ya omitido.
 *
 * Se PORTAN, con divergencia declarada en sus propias funciones:
 * `isLoopPersistentPreambleEnabled` (lee `CLAUDE_CODE_LOOP_PERSISTENT`
 * con `process.env` directo — `readEnv` de
 * `@claude-code-how-works/config/env` es, verificado contra la fuente,
 * exactamente `process.env[name]` sin transformación,
 * `ccnmt: packages/config/env/utils.ts:198`, re-exportado por
 * `packages/config/env/index.ts` — y usa un stand-in local para
 * `getFeatureValue_CACHED_MAY_BE_STALE` que siempre devuelve el
 * `defaultValue`: sin overrides ni `LOCAL_GATE_DEFAULTS`, que viven en
 * `@claude-code-how-works/config/feature-flags`, ausente).
 */

export const AUTONOMOUS_LOOP_SENTINEL = '<<autonomous-loop>>'
export const AUTONOMOUS_LOOP_DYNAMIC_SENTINEL = '<<autonomous-loop-dynamic>>'
export const LOOP_FILE_SENTINEL = '<<loop.md>>'
export const LOOP_FILE_DYNAMIC_SENTINEL = '<<loop.md-dynamic>>'

/** Stand-in local, declarado arriba: `process.env[name]` sin transformar. */
function readEnv(name: string): string | undefined {
  return process.env[name]
}

/** Stand-in local, declarado arriba: siempre el `defaultValue`. */
function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  _feature: string,
  defaultValue?: T,
): T {
  return defaultValue as T
}

/**
 * Ant `EY8` — preámbulo default / steward. Se usa cuando `_66()` es
 * false. Verbatim de ant v2.1.136 2924.js.
 */
export const AUTONOMOUS_LOOP_PREAMBLE = `# Autonomous loop check

You're being invoked on a timer while the user is away or occupied. The point is to keep work moving forward without the user driving every step — finishing things they started, maintaining PRs they're building, catching problems before they come back to find them. You're a steward, not an initiator. The user set you loose on their work, and the value you provide comes from reliably advancing things they've already set in motion, not from finding new things to do.

The key tension to navigate: the user trusts you enough to run autonomously, but that trust is easily lost. Acting on what the conversation already established is safe and valuable. Inventing new work or making irreversible changes without clear authorization erodes trust fast. When you're unsure whether something falls into "continuing established work" or "inventing new work," lean toward the former only when the transcript provides clear evidence the user wanted it done. If you find yourself reaching for justifications about why a push is probably fine, that's a signal to wait.

## What to act on

The current conversation is your highest-signal source — re-read the transcript above, since everything there is something the user was actively engaged with. The strongest signal is an in-progress PR you've been building together: review comments to address and resolve, failing CI checks to diagnose (and re-enqueue if they're flakes), merge conflicts to fix. The goal is to get the PR into a state where it's ready to merge pending only human review — the user shouldn't come back to find a PR blocked on things you could have handled. After that, look for unfinished implementation where the last exchange left something half-done, and explicit "I'll also..." or "next I'll..." commitments the conversation made and didn't honor. Weaker but still real: dangling questions you could now answer, verification steps that were skipped, edge cases that were mentioned but not handled, and natural continuations that don't require new decisions.

If you find anything in this category, act on it — actually do the work, don't describe what could be done. Run the tests, don't say "you could run the tests." The whole point of autonomous operation is that work gets done while the user is away.

When the conversation transcript has nothing left, the current branch's pull/merge request on the user's SCM is the next-best place to look. This is maintenance work — valuable, but lower priority than continuing the user's active work. Find the PR/MR for the current branch via the SCM's CLI, then check three things: CI status, unresolved review threads, and whether the branch has fallen behind the base. For failing CI, pull the failing job's logs and diagnose before acting — flaky-shaped failures (timeout, runner died, transient network) can be re-enqueued; real failures need a reproduction and a minimal fix. For unresolved review threads, fetch the comment, address the feedback, push, and resolve the thread via, for example, the GitHub GraphQL \`resolveReviewThread\` mutation (or the equivalent for whichever SCM the project uses). Before pushing anything, check whether someone else has pushed to the branch while you were working — if so, rebase (don't merge) to keep history clean.

When CI is green, threads are clear, and there's idle time, sweeping the branch for issues is a good use of that time — bug-hunt or simplification passes catch problems before reviewers do, saving everyone a round-trip.

If everything is genuinely quiet — no conversation work, no PR maintenance — say so in one sentence and stop. No summary of what you checked, no list of what you might do later. The user will see your message in the transcript when they come back; three consecutive "nothing to do" results means you should scale back to a quick CI check and stop, not narrate.

## Repeated invocations

If you see earlier autonomous checks in this conversation, adjust your scope accordingly. If a previous check left a question the user hasn't answered, the cost of acting depends on reversibility: for reversible actions (local edits, running tests), make your best call and proceed; for irreversible ones (pushing, deleting, sending), keep waiting — the cost of acting wrongly on something irreversible is much higher than the cost of waiting one more cycle. If three or more consecutive checks have found nothing actionable, things are quiet — do one quick CI/threads check and stop in a single line. Repeated "nothing to do" messages clutter the transcript and waste the user's attention when they come back to review.

Read and analyze freely — understanding the state of things has no blast radius. Make edits and run tests when you're confident they continue established work. Commit and push only when you're clearly continuing something the user authorized, or when the work pattern makes the intent obvious — like fixing CI on a PR you've been building together.
`

/**
 * Ant `q67` — preámbulo del modo persistente. La cabecera es LA MISMA
 * que la default ("# Autonomous loop check"); las diferencias son:
 *   - framing explícito de reversibilidad ("For irreversible
 *     actions... For reversible actions, bias toward acting...")
 *   - "keep the loop alive" en la rama quieta (en vez de "say so in
 *     one sentence and stop")
 *   - "broaden scope once before considering stopping" en vez de "do
 *     one quick CI/threads check and stop"
 *
 * Verbatim de ant v2.1.136 2924.js.
 */
const AUTONOMOUS_LOOP_PREAMBLE_PERSISTENT = `# Autonomous loop check

You're being invoked on a timer while the user is away or occupied. The point is to keep work moving forward without the user driving every step — finishing things they started, maintaining PRs they're building, catching problems before they come back to find them, and following through on the *spirit* of the task they gave you, not just its literal scope. The user set you loose on their work, and the value you provide comes from reliably advancing things they've already set in motion.

The key tension to navigate: the user trusts you enough to run autonomously, but that trust is easily lost. Acting on what the conversation already established is safe and valuable. For irreversible actions (push, delete, send), require clear authorization in the transcript or use a reversible alternative (a draft, a local commit, a queued message). For reversible actions (edits, tests, drafts, exploration), bias toward acting — the cost of an unneeded local edit is near zero, and the cost of a stalled loop is high. When you're unsure whether something falls into "continuing established work" or "inventing new work," lean toward continuing whenever the transcript gives you any reasonable thread to pull on.

## What to act on

The current conversation is your highest-signal source — re-read the transcript above, since everything there is something the user was actively engaged with. The strongest signal is an in-progress PR you've been building together: review comments to address and resolve, failing CI checks to diagnose (and re-enqueue if they're flakes), merge conflicts to fix. The goal is to get the PR into a state where it's ready to merge pending only human review — the user shouldn't come back to find a PR blocked on things you could have handled. After that, look for unfinished implementation where the last exchange left something half-done, and explicit "I'll also..." or "next I'll..." commitments the conversation made and didn't honor. Weaker but still real: dangling questions you could now answer, verification steps that were skipped, edge cases that were mentioned but not handled, and natural continuations that don't require new decisions.

If you find anything in this category, act on it — actually do the work, don't describe what could be done. Run the tests, don't say "you could run the tests." The whole point of autonomous operation is that work gets done while the user is away.

When the conversation transcript has nothing left, the current branch's pull/merge request on the user's SCM is the next-best place to look. This is maintenance work — valuable, but lower priority than continuing the user's active work. Find the PR/MR for the current branch via the SCM's CLI, then check three things: CI status, unresolved review threads, and whether the branch has fallen behind the base. For failing CI, pull the failing job's logs and diagnose before acting — flaky-shaped failures (timeout, runner died, transient network) can be re-enqueued; real failures need a reproduction and a minimal fix. For unresolved review threads, fetch the comment, address the feedback, push, and resolve the thread via, for example, the GitHub GraphQL \`resolveReviewThread\` mutation (or the equivalent for whichever SCM the project uses). Before pushing anything, check whether someone else has pushed to the branch while you were working — if so, rebase (don't merge) to keep history clean.

When CI is green, threads are clear, and there's idle time, sweeping the branch for issues is a good use of that time — bug-hunt or simplification passes catch problems before reviewers do, saving everyone a round-trip.

If everything is genuinely quiet — no conversation work, no PR maintenance — say so in one sentence and keep the loop alive. Before stopping, broaden once: re-read the original task framing, check whether earlier ticks deferred anything ("I'll wait for X"), and look at sibling PRs/branches the user owns. Persistence is the point of autonomous mode. Only stop if the original task is provably complete or the user said to stop. (Pacing — how long to wait before the next tick — is handled by the per-mode reminder appended to this preamble; don't try to manage delay from here.)

## Repeated invocations

If you see earlier autonomous checks in this conversation, adjust your scope accordingly. If a previous check left a question the user hasn't answered, the cost of acting depends on reversibility: for reversible actions (local edits, running tests), make your best call and proceed; for irreversible ones (pushing, deleting, sending), keep waiting — the cost of acting wrongly on something irreversible is much higher than the cost of waiting one more cycle. If three or more consecutive checks have found nothing actionable, broaden scope once before considering stopping — re-read the original task, check sibling work, look for verification or polish steps that were skipped. A loop that quits the moment work goes quiet is less useful than one that waits.

Read and analyze freely — understanding the state of things has no blast radius. Make edits and run tests when you're confident they continue established work. Commit and push only when you're clearly continuing something the user authorized, or when the work pattern makes the intent obvious — like fixing CI on a PR you've been building together.
`

// Estado por sesión — a nivel de módulo. Se resetea al cambiar de
// sesión vía `resetAutonomousLoopDelivered`.
let loopPreambleDelivered = false
let loopFileLastContent: string | null = null

export function resetAutonomousLoopDelivered(): void {
  loopPreambleDelivered = false
  loopFileLastContent = null
}

export function isAutonomousLoopSentinel(prompt: string): boolean {
  return (
    prompt === AUTONOMOUS_LOOP_SENTINEL ||
    prompt === AUTONOMOUS_LOOP_DYNAMIC_SENTINEL
  )
}

export function isLoopFileSentinel(prompt: string): boolean {
  return (
    prompt === LOOP_FILE_SENTINEL || prompt === LOOP_FILE_DYNAMIC_SENTINEL
  )
}

export function isLoopDefaultSentinel(prompt: string): boolean {
  return isAutonomousLoopSentinel(prompt) || isLoopFileSentinel(prompt)
}

/**
 * Ant `_66` (verbatim). La variable de entorno gana a la bandera.
 *   - `CLAUDE_CODE_LOOP_PERSISTENT` truthy seteada → persistente
 *   - si no, la bandera `tengu_kairos_loop_persistent` → persistente
 *   - si no, default (steward)
 *
 * Pública para que la telemetría de activación pueda reportar la
 * variante resuelta.
 */
export function isLoopPersistentPreambleEnabled(): boolean {
  const env = readEnv('CLAUDE_CODE_LOOP_PERSISTENT')
  if (env && /^(1|true|yes)$/i.test(env)) return true
  if (env && /^(0|false|no)$/i.test(env)) return false
  return getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_kairos_loop_persistent',
    false,
  )
}

/**
 * Ant `CY8`. Devuelve el preámbulo correcto para la sesión/entorno
 * actual.
 */
export function getAutonomousLoopPreamble(): string {
  return isLoopPersistentPreambleEnabled()
    ? AUTONOMOUS_LOOP_PREAMBLE_PERSISTENT
    : AUTONOMOUS_LOOP_PREAMBLE
}

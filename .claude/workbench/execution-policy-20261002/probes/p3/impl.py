from pathlib import Path
import shutil
shutil.copy('/scratch/p3/executionPolicy.ts', 'src/packages/provider/src/cost/executionPolicy.ts')
def patch(path, pairs):
    p = Path(path); s = p.read_text()
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:70]); s = s.replace(old, new)
    p.write_text(s)
patch('src/packages/provider/src/cost/policy.ts', [
("import { promptCacheKey } from './cacheBreak.ts'",
 "import { promptCacheKey } from './cacheBreak.ts'\nimport { allowsEntry, type ExecutionPolicy } from './executionPolicy.ts'\n\nexport { ExecutionPolicyError, parseExecutionPolicy, type ExecutionPolicy } from './executionPolicy.ts'"),
("export type ExecutionRecommendation = LocalExecution | ProviderExecution",
 """/**
 * Ningún modelo que la política permite cumple, y la política no permite el
 * respaldo: no hay ejecución que recomendar. No lleva modelo a propósito.
 */
export type BlockedExecution = {
  runtime: 'blocked'
  taskClass: TaskKind
  contextTokens: number
  blockedReason: string
}

export type ExecutionRecommendation = LocalExecution | ProviderExecution | BlockedExecution"""),
("""  local: LocalModelInventory,
): ExecutionRecommendation {
  const [fastest] = qualifiedModels(local.entries, local.qualifications, kind, profile.contextTokens)""",
"""  local: LocalModelInventory,
  policy?: ExecutionPolicy,
): ExecutionRecommendation {
  // Con política, sólo compiten los modelos que permite; sin ella, todos (el comportamiento previo).
  const permitted = policy === undefined ? local : { ...local, entries: local.entries.filter(entry => allowsEntry(policy, entry)) }
  const [fastest] = qualifiedModels(permitted.entries, permitted.qualifications, kind, profile.contextTokens)"""),
("""  return { ...providerExecution(kind, profile), fallbackReason: localFallbackReason(kind, profile, local) }""",
"""  const reason = localFallbackReason(kind, profile, permitted)
  if (policy !== undefined && !policy.fallback.enabled) {
    return { runtime: 'blocked', taskClass: kind, contextTokens: profile.contextTokens,
      blockedReason: `la política no permite respaldo y ningún modelo permitido cumple: ${reason}` }
  }
  return { ...providerExecution(kind, profile), fallbackReason: reason }"""),
])
patch('src/packages/agent/bin/recommend.ts', [
(""" * Salidas: 0 con recomendación · 2 si ningún modelo cumple el perfil, si un""",
""" * `--policy <archivo>` declara la política de ejecución del consumidor
 * (TASK-THYROX-0758): sólo compiten los modelos locales que permite y, si no
 * permite el respaldo, sin ninguno cualificado la recomendación es
 * `blocked` —sale 3, sin modelo— en vez de caer a `claude-cli`; y
 * `--runtime claude-cli` contra esa política se rehúsa.
 *
 * Salidas: 0 con recomendación · 3 bloqueada por la política · 2 si ningún modelo cumple el perfil, si un"""),
("""  providerExecution,
  recommendExecution,""",
"""  ExecutionPolicyError,
  parseExecutionPolicy,
  providerExecution,
  recommendExecution,
  type ExecutionPolicy,"""),
("""const EXIT_REFUSED = 2
""", """const EXIT_REFUSED = 2
const EXIT_BLOCKED = 3
"""),
("""const OPTIONS_WITH_VALUE = new Set(['--context', '--runtime'])""",
 """const OPTIONS_WITH_VALUE = new Set(['--context', '--runtime', '--policy'])"""),
("""  runtime?: string
  json: boolean""", """  runtime?: string
  policy?: string
  json: boolean"""),
("""      if (argument === '--context') parsed.context = value
      else parsed.runtime = value""",
"""      if (argument === '--context') parsed.context = value
      else if (argument === '--policy') parsed.policy = value
      else parsed.runtime = value"""),
("""    'uso: bun run bin/recommend.ts <clase> [--context N] [--runtime claude-cli] [--json]',""",
 """    'uso: bun run bin/recommend.ts <clase> [--context N] [--runtime claude-cli] [--policy ARCHIVO] [--json]',"""),
("""async function chooseExecution(kind: TaskKind, contextTokens: number, runtime: string | undefined): Promise<ExecutionRecommendation & { runtimeDeclared?: true }> {
  if (runtime !== undefined) {
    requireDeclarableRuntime(runtime)""",
"""/** La política del consumidor; ilegible o inválida rehúsa con su ruta, nunca se ignora. */
async function loadPolicy(path: string): Promise<ExecutionPolicy> {
  try {
    return parseExecutionPolicy(await readFile(path, 'utf8'))
  } catch (error) {
    const cause = error instanceof ExecutionPolicyError ? error.message : `ilegible: ${(error as Error).message}`
    throw new RefusalError(`política de ejecución ${path}: ${cause}`)
  }
}

async function chooseExecution(kind: TaskKind, contextTokens: number, runtime: string | undefined,
  policy: ExecutionPolicy | undefined): Promise<ExecutionRecommendation & { runtimeDeclared?: true }> {
  if (runtime !== undefined) {
    requireDeclarableRuntime(runtime)
    if (policy !== undefined && !policy.fallback.enabled) {
      throw new RefusalError(`--runtime ${runtime} contra una política que no permite el proveedor: no se declara`)
    }"""),
("""  return recommendExecution(kind, { contextTokens }, inventory)""",
 """  return recommendExecution(kind, { contextTokens }, inventory, policy)"""),
("""  const execution = await chooseExecution(kind, contextTokens, options.runtime)
  if (options.json) console.log(JSON.stringify(execution, null, 2))
  else if (execution.runtime === 'ollama') printLocal(execution)
  else printProvider(execution, contextTokens, execution.runtimeDeclared === true)
  return EXIT_OK""",
"""  const policy = options.policy === undefined ? undefined : await loadPolicy(options.policy)
  const execution = await chooseExecution(kind, contextTokens, options.runtime, policy)
  if (options.json) console.log(JSON.stringify(execution, null, 2))
  if (execution.runtime === 'blocked') {
    console.error(`recommend: bloqueada — ${execution.blockedReason}`)
    return EXIT_BLOCKED
  }
  if (options.json) return EXIT_OK
  if (execution.runtime === 'ollama') printLocal(execution)
  else printProvider(execution, contextTokens, execution.runtimeDeclared === true)
  return EXIT_OK"""),
])
print('ok')

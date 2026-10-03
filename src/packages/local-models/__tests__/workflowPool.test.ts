import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'

import { poolCaseRunner, WorkflowPoolError } from '../workflowPool.ts'
import type { WorkflowSuite } from '../workflowSuite.ts'

const ARTIFACT = resolvedArtifact()
const SUITE: WorkflowSuite = {
  id: 'repo-code-change@1', taskClass: 'mecanica', promptPath: '/suite/prompt.md', tools: ['Read', 'Write', 'Edit', 'Bash'],
  cases: [{ id: 'title-slug', item: 'Implement title_slug.', verify: 'bash verify.sh' }],
}

let directory: string | undefined
afterEach(() => {
  if (directory !== undefined) rmSync(directory, { recursive: true, force: true })
  directory = undefined
})

/** Un doble del pool: registra su argv, su stdin y la política, y deja el verdict y el resultado del ítem. */
function fakePool(verdict: string, result: string): string {
  directory = mkdtempSync(join(tmpdir(), 'workflow-pool-'))
  const pool = join(directory, 'headless-pool')
  writeFileSync(pool, `#!/usr/bin/env bash
printf '%s\\n' "$@" > '${directory}/argv'
cat > '${directory}/stdin'
out=""; policy=""
while [[ $# -gt 0 ]]; do case "$1" in --out) out="$2"; shift 2 ;; --model-policy) policy="$2"; shift 2 ;; *) shift ;; esac; done
cp "$policy" '${directory}/policy.json'
mkdir -p "$out"; printf '%s\\n' '${verdict}' > "$out/1.verdict"; printf '%s\\n' '{"type":"system"}' '${result}' > "$out/1.json"
`)
  chmodSync(pool, 0o755)
  return pool
}

const RESULT = '{"type":"result","duration_ms":120000,"usage":{"output_tokens":900}}'

describe('poolCaseRunner (TASK-THYROX-0931)', () => {
  test('corre el caso en una unidad, worktree aislado, sólo local, con el verify, el contexto y las herramientas de la suite', async () => {
    const pool = fakePool('verificado', RESULT)
    const runCase = poolCaseRunner({ suite: SUITE, artifact: ARTIFACT, contextTokens: 8192, thyroxRoot: directory as string, outDir: join(directory as string, 'out'), poolBin: pool })
    expect(await runCase(SUITE.cases[0]!)).toEqual({ verdict: 'verificado', outputTokens: 900, durationMs: 120_000 })
    const argv = readFileSync(join(directory as string, 'argv'), 'utf8').trim().split('\n')
    const option = (flag: string) => argv[argv.indexOf(flag) + 1]
    expect(option('--execution')).toBe('unit')
    expect(option('--isolation')).toBe('worktree')
    expect(argv).toContain('--local-only')
    expect(option('--verify')).toBe('bash verify.sh')
    expect(option('--task-class')).toBe('mecanica')
    expect(option('--context-tokens')).toBe('8192')
    expect(option('--tools')).toBe('Read,Write,Edit,Bash')
    expect(option('--prompt')).toBe('/suite/prompt.md')
    expect(option('--work-reference')).toBe('thyrox:qualification/repo-code-change-1/title-slug')
    expect(readFileSync(join(directory as string, 'stdin'), 'utf8')).toBe('Implement title_slug.\n')
  })

  test('la política del pool permite sólo el modelo medido y cierra el respaldo', async () => {
    const pool = fakePool('verificado', RESULT)
    await poolCaseRunner({ suite: SUITE, artifact: ARTIFACT, contextTokens: 8192, thyroxRoot: directory as string, outDir: join(directory as string, 'out'), poolBin: pool })(SUITE.cases[0]!)
    const policy = JSON.parse(readFileSync(join(directory as string, 'policy.json'), 'utf8'))
    expect(policy.allowed).toEqual([{ runtime: 'ollama', repository: ARTIFACT.repository, quantization: ARTIFACT.quantization, source: ARTIFACT.source }])
    expect(policy.fallback).toEqual({ enabled: false })
  })

  test('un ítem sin resultado cuenta cero tokens: el verdict decide, la velocidad no se inventa', async () => {
    const pool = fakePool('fallido', '{"type":"system"}')
    const runCase = poolCaseRunner({ suite: SUITE, artifact: ARTIFACT, contextTokens: 8192, thyroxRoot: directory as string, outDir: join(directory as string, 'out'), poolBin: pool })
    expect(await runCase(SUITE.cases[0]!)).toEqual({ verdict: 'fallido', outputTokens: 0, durationMs: 0 })
  })

  test('sin verdict el pool no llegó a finalizar el ítem: se rehúsa en vez de suspender en silencio', async () => {
    directory = mkdtempSync(join(tmpdir(), 'workflow-pool-'))
    const pool = join(directory, 'headless-pool')
    writeFileSync(pool, '#!/usr/bin/env bash\ncat >/dev/null\necho "rehusa: sin modelo" >&2\nexit 2\n')
    chmodSync(pool, 0o755)
    const runCase = poolCaseRunner({ suite: SUITE, artifact: ARTIFACT, contextTokens: 8192, thyroxRoot: directory, outDir: join(directory, 'out'), poolBin: pool })
    await expect(runCase(SUITE.cases[0]!)).rejects.toThrow(new WorkflowPoolError('title-slug', 2, 'rehusa: sin modelo'))
  })
})

describe('poolCaseRunner — presupuesto de sistema', () => {
  test('con presupuesto declarado, el pool lo recibe; sin él, no se inventa', async () => {
    const pool = fakePool('verificado', RESULT)
    const options = { artifact: ARTIFACT, contextTokens: 8192, thyroxRoot: directory as string, outDir: join(directory as string, 'out'), poolBin: pool }
    await poolCaseRunner({ ...options, suite: { ...SUITE, systemBudgetTokens: 2000 } })(SUITE.cases[0]!)
    let argv = readFileSync(join(directory as string, 'argv'), 'utf8').trim().split('\n')
    expect(argv[argv.indexOf('--system-budget-tokens') + 1]).toBe('2000')
    await poolCaseRunner({ ...options, suite: SUITE })(SUITE.cases[0]!)
    argv = readFileSync(join(directory as string, 'argv'), 'utf8').trim().split('\n')
    expect(argv).not.toContain('--system-budget-tokens')
  })
})

/**
 * Cableado de `--compress-tool-results` en el consumidor real de la CLI
 * (`src/entry/runLoop.ts`).
 *
 * `agent/__tests__/contextCompressionWiring.test.ts` ya mide el mecanismo
 * a nivel de `runLoop`/`streamLoop` de `@thyrox/agent/loop` -- este archivo
 * mide que el consumidor de PRODUCCION (`runCli()`, el binario `thyrox`)
 * lo active. El control que discrimina: sin la bandera, el ruido de
 * `git status` llega intacto al `tool_result` del transcript; con ella,
 * RTK lo recorta -- exactamente por el mismo comando real que el modelo
 * grabado invoca.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runCli } from '../src/entry/main.ts'
import type { AssistantTurn, ContentBlock } from '@thyrox/agent/loop/types'

const usage = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }

// El mismo ruido de `git status` que el filtro `git-status` de
// `@thyrox/context-compression` ya prueba en su propia suite.
const GIT_STATUS_OUTPUT =
  'On branch main\n' +
  'Changes not staged for commit:\n' +
  '  (use "git add <file>..." to update what will be committed)\n' +
  '  (use "git restore <file>..." to discard changes in working directory)\n' +
  '\tmodified:   a.ts\n' +
  '\n' +
  'no changes added to commit\n'

// Heredoc con delimitador entre comillas: bash lo emite verbatim, sin
// interpretar `$`, comillas ni backticks del contenido.
const BASH_COMMAND = `cat <<'GITSTATUSEOF'\n${GIT_STATUS_OUTPUT}GITSTATUSEOF`

function gitStatusRecording(): AssistantTurn[] {
  return [
    {
      id: 'm-1', model: 'claude-opus-5', stop_reason: 'tool_use', usage,
      content: [{ type: 'tool_use', id: 'tu-1', name: 'Bash', input: { command: BASH_COMMAND } }],
    },
    {
      id: 'm-2', model: 'claude-opus-5', stop_reason: 'end_turn', usage,
      content: [{ type: 'text', text: 'listo' }],
    },
  ]
}

/** El bloque `tool_result` del ÚNICO turno de usuario con herramienta en el transcript. */
function toolResultContent(dir: string): string {
  const file = readdirSync(dir).find((f) => f.endsWith('.jsonl'))!
  const lines = readFileSync(join(dir, file), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  for (const line of lines) {
    const block = (line.message?.content as ContentBlock[] | undefined)
      ?.find((b) => b.type === 'tool_result')
    if (block) return (block as { content: string }).content
  }
  throw new Error('el transcript no trae ningún tool_result')
}

async function run(flags: string[]): Promise<string> {
  const d = mkdtempSync(join(tmpdir(), 'compress-wiring-'))
  const recording = join(d, 'grabacion.json')
  writeFileSync(recording, JSON.stringify(gitStatusRecording()))
  const transcriptDir = join(d, 'transcripts')

  // `--cwd d` aísla el prompt de sistema del árbol real: sin esto, el
  // system prompt embebe el CLAUDE.md/reglas de ESTA sesión, que no aporta
  // nada al control y sólo alarga el transcript a comparar.
  //
  // `--grabacion` es el nombre real de la bandera ya declarada en
  // `runLoop.ts` (`flag(argv, 'grabacion')`) -- no se renombra aquí porque
  // no es identificador propio de este archivo, es la superficie pública
  // ya existente del comando.
  const code = await runCli([
    '--prompt', 'corre git status',
    '--provider', 'recorded', '--grabacion', recording,
    '--transcript-dir', transcriptDir,
    '--output-style', 'quiet',
    '--cwd', d,
    ...flags,
  ])
  expect(code).toBe(0)
  return toolResultContent(transcriptDir)
}

describe('--compress-tool-results en runCli() (consumidor real)', () => {
  test('APAGADO (default): el ruido de git status llega intacto al tool_result', async () => {
    const content = await run([])
    expect(content).toContain('to update what will be committed')
  })

  test('ENCENDIDO: RTK detecta git-status por el comando real y lo quita del tool_result', async () => {
    const content = await run(['--compress-tool-results'])
    expect(content).not.toContain('to update what will be committed')
    expect(content).toContain('modified:   a.ts')
  })
})

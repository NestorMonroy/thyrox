/**
 * Wireado de `@thyrox/context-compression` en el bucle (opt-in).
 *
 * `ContextOptions.compressToolResults` es `false` por defecto -- estos tests
 * son el control de anulación de esa afirmación: con la bandera apagada
 * (default), la salida ruidosa de un tool_result real llega intacta al
 * siguiente request; con ella encendida, RTK la recorta antes de que entre
 * al historial.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLoop } from '../loop/index.ts'
import { RecordedProvider } from '@thyrox/provider/recorded'
import { CORE_TOOLS } from '@thyrox/tools/registry'
import type { AssistantTurn } from '../loop/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'ctx-compress-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const texto = (t: string): AssistantTurn =>
  ({ id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: uso })

// Salida de `git status` con el ruido tipico que RTK recorta ("(use ..." y
// lineas en blanco) -- la MISMA forma que el filtro `git-status` ya prueba
// en su propia suite, ejercitada aqui a traves del bucle real.
const SALIDA_GIT_STATUS =
  'On branch main\n' +
  'Changes not staged for commit:\n' +
  '  (use "git add <file>..." to update what will be committed)\n' +
  '  (use "git restore <file>..." to discard changes in working directory)\n' +
  '\tmodified:   a.ts\n' +
  '\n' +
  'no changes added to commit\n'

// Heredoc con delimitador entre comillas: bash lo emite verbatim, sin
// interpretar `$`, comillas ni backticks del contenido -- la forma segura
// de producir un texto arbitrario como salida real del tool Bash.
const COMANDO_BASH = `cat <<'GITSTATUSEOF'\n${SALIDA_GIT_STATUS}GITSTATUSEOF`

function correr(comprimir: boolean) {
  const d = dir()
  const p = new RecordedProvider([
    {
      id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
      content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: COMANDO_BASH } }],
    },
    texto('listo'),
  ])
  return runLoop({
    provider: p, model: 'claude-opus-5', system: 's', prompt: 'corre git status',
    tools: CORE_TOOLS, cwd: d, transcriptDir: d,
    context: { compressToolResults: comprimir },
  }).then(() => p)
}

describe('compressToolResults en el bucle real (opt-in)', () => {
  test('APAGADO (default): el ruido de git status llega intacto al siguiente request', async () => {
    const p = await correr(false)
    const resultado = p.requests[1].messages.flatMap((m) => m.content)
      .find((b) => b.type === 'tool_result') as { content: string }
    expect(resultado.content).toContain('(use "git add')
  })

  test('ENCENDIDO: RTK detecta git-status por el comando real y quita el ruido', async () => {
    const p = await correr(true)
    const resultado = p.requests[1].messages.flatMap((m) => m.content)
      .find((b) => b.type === 'tool_result') as { content: string }
    expect(resultado.content).not.toContain('(use "git add')
    expect(resultado.content).toContain('modified:   a.ts')
  })
})

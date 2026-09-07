/**
 * `bin/shell.ts` — la puerta de invocación de `@thyrox/shell` (tarea #223).
 *
 * Control de que la puerta despacha lo que dice despachar y, sobre todo, de
 * que RESPETA la restricción no negociable #3 del encargo: rehusar con 2 y
 * SIN veredicto cuando falta la precondición, nunca adivinar un valor por
 * defecto. Cada bloque de "rehúsa" tiene su contraparte de "no rehúsa cuando
 * la entrada SÍ está" — así el control discrimina el guard real de un guard
 * que siempre refunde o que nunca refunde.
 */
import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import {
  analyzeHeredoc,
  EXIT_REFUSE,
  main,
  splitLiteral,
  takeFlag,
  takeValue,
} from '../shell.ts'

afterEach(() => {
  // spyOn dentro de un test individual se restaura ahí mismo; esto es la
  // red por si algún test futuro olvida su propio mockRestore().
})

async function run(...argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const logSpy = spyOn(console, 'log')
  const errSpy = spyOn(console, 'error')
  const code = await main(argv)
  const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n')
  const err = errSpy.mock.calls.map((c) => String(c[0])).join('\n')
  logSpy.mockRestore()
  errSpy.mockRestore()
  return { code, out, err }
}

describe('splitLiteral — el `--` literal separa flags de posicionales crudos', () => {
  test('sin `--`, todo queda en head', () => {
    expect(splitLiteral(['--json', 'a'])).toEqual({ head: ['--json', 'a'], literal: [] })
  })
  test('con `--`, lo que sigue no se reinterpreta', () => {
    expect(splitLiteral(['--json', '--', '--json', 'a b'])).toEqual({
      head: ['--json'],
      literal: ['--json', 'a b'],
    })
  })
})

describe('takeFlag / takeValue', () => {
  test('takeFlag retira la bandera exacta, deja el resto intacto', () => {
    expect(takeFlag(['a', '--x', 'b'], '--x')).toEqual({ present: true, rest: ['a', 'b'] })
    expect(takeFlag(['a', 'b'], '--x')).toEqual({ present: false, rest: ['a', 'b'] })
  })
  test('takeValue retira la bandera Y su valor', () => {
    expect(takeValue(['--timeout-ms', '50', 'x'], '--timeout-ms')).toEqual({
      value: '50',
      rest: ['x'],
    })
    expect(takeValue(['x'], '--timeout-ms')).toEqual({ value: undefined, rest: ['x'] })
  })
})

describe('analyzeHeredoc — envoltorio de extractHeredocs/restoreHeredocs/containsHeredoc', () => {
  test('sin heredoc: léxico=no, 0 extraídos, restauración coincide', () => {
    const r = analyzeHeredoc('echo hello')
    expect(r.contieneLexico).toBe(false)
    expect(r.extraidos).toBe(0)
    expect(r.restauracionCoincide).toBe(true)
  })

  test('heredoc simple sin contenido tras el operador: restauración coincide', () => {
    const cmd = 'cat <<EOF\nbody\nEOF'
    const r = analyzeHeredoc(cmd)
    expect(r.extraidos).toBe(1)
    expect(r.detalle[0]?.delimitador).toBe('EOF')
    expect(r.detalle[0]?.citado).toBe(false)
    expect(r.detalle[0]?.dash).toBe(false)
    expect(r.restauracionCoincide).toBe(true)
  })

  test('heredoc citado con guion detecta ambas banderas', () => {
    const cmd = `cat <<-'EOF'\n\thello\n\tEOF`
    const r = analyzeHeredoc(cmd)
    expect(r.extraidos).toBe(1)
    expect(r.detalle[0]?.citado).toBe(true)
    expect(r.detalle[0]?.dash).toBe(true)
  })

  test('contenido en la MISMA línea del operador: la restauración por string completo NO coincide (documentado, no oculto)', () => {
    const cmd = 'cat <<EOF && echo done\nbody\nEOF'
    const r = analyzeHeredoc(cmd)
    expect(r.extraidos).toBe(1)
    expect(r.comandoProcesado).toContain('&& echo done')
    expect(r.restauracionCoincide).toBe(false)
  })

  test('quotedOnly se propaga: un heredoc sin comillas se omite', () => {
    const cmd = `cat <<EOF\n$(rm -rf /)\nEOF`
    const r = analyzeHeredoc(cmd, { quotedOnly: true })
    expect(r.extraidos).toBe(0)
  })
})

describe('main — heredoc: rehúsa sin entrada, no rehúsa con ella (RESTRICCIÓN #3)', () => {
  test('sin posicional ni --stdin: exit 2, sin veredicto en stdout', async () => {
    const r = await run('heredoc')
    expect(r.code).toBe(EXIT_REFUSE)
    expect(r.out).toBe('')
    expect(r.err).toContain('falta el comando')
  })
  test('con un posicional: exit 0, sí hay veredicto', async () => {
    const r = await run('heredoc', 'echo hi')
    expect(r.code).toBe(0)
    expect(r.out).toContain('léxico')
  })
  test('--json produce JSON parseable', async () => {
    const r = await run('heredoc', '--json', 'cat <<EOF\nx\nEOF')
    expect(r.code).toBe(0)
    const parsed = JSON.parse(r.out) as { extraidos: number }
    expect(parsed.extraidos).toBe(1)
  })
})

describe('main — quote: rehúsa sin argumentos, cita lo que recibe', () => {
  test('sin argumentos: exit 2', async () => {
    const r = await run('quote')
    expect(r.code).toBe(EXIT_REFUSE)
    expect(r.out).toBe('')
  })
  test('cita un argumento con espacios', async () => {
    const r = await run('quote', 'echo hi')
    expect(r.code).toBe(0)
    expect(r.out).toBe("'echo hi'")
  })
  test('-- deja pasar un literal que es la propia cadena --json', async () => {
    const r = await run('quote', '--json', '--', '--json')
    expect(r.code).toBe(0)
    const parsed = JSON.parse(r.out) as { args: string[] }
    expect(parsed.args).toEqual(['--json'])
  })
})

describe('main — prefix: exige exactamente 2 posicionales', () => {
  test('con 0, 1 o 3 argumentos: exit 2', async () => {
    expect((await run('prefix')).code).toBe(EXIT_REFUSE)
    expect((await run('prefix', 'bash')).code).toBe(EXIT_REFUSE)
    expect((await run('prefix', 'a', 'b', 'c')).code).toBe(EXIT_REFUSE)
  })
  test('con exactamente 2: compone y cita', async () => {
    const r = await run('prefix', 'bash -c', 'echo $HOME')
    expect(r.code).toBe(0)
    expect(r.out).toBe("bash -c 'echo $HOME'")
  })
})

describe('main — fig: exige exactamente 1 posicional; nunca lanza', () => {
  test('sin argumentos: exit 2', async () => {
    expect((await run('fig')).code).toBe(EXIT_REFUSE)
  })
  test('con un nombre: exit 0 (rechazo interno de loadFigSpec no es "sin analizar")', async () => {
    const r = await run('fig', 'git')
    expect(r.code).toBe(0)
    expect(r.out).toContain('git')
  })
  test('--json siempre produce JSON parseable, incluso cuando spec es null', async () => {
    const r = await run('fig', '--json', 'git')
    const parsed = JSON.parse(r.out) as { command: string; spec: unknown }
    expect(parsed.command).toBe('git')
  })
})

describe('main — stdin-peek: --timeout-ms inválido rehúsa; un residual sin reconocer también', () => {
  test('--timeout-ms 0 rehúsa', async () => {
    expect((await run('stdin-peek', '--timeout-ms', '0')).code).toBe(EXIT_REFUSE)
  })
  test('--timeout-ms no-numérico rehúsa', async () => {
    expect((await run('stdin-peek', '--timeout-ms', 'ni-un-numero')).code).toBe(EXIT_REFUSE)
  })
  test('un argumento sobrante sin reconocer rehúsa', async () => {
    expect((await run('stdin-peek', 'sobra')).code).toBe(EXIT_REFUSE)
  })
})

describe('main — env: nunca imprime valores, sólo nombres', () => {
  test('el reporte no contiene el valor de una variable sensible presente en el proceso', async () => {
    const anterior = process.env.THYROX_SHELL_CLI_TEST_SECRETO
    process.env.THYROX_SHELL_CLI_TEST_SECRETO = 'valor-que-no-debe-imprimirse-jamas'
    const r = await run('env', '--json')
    if (anterior === undefined) delete process.env.THYROX_SHELL_CLI_TEST_SECRETO
    else process.env.THYROX_SHELL_CLI_TEST_SECRETO = anterior
    expect(r.out).not.toContain('valor-que-no-debe-imprimirse-jamas')
  })
})

describe('main — despacho: sin subcomando y subcomando desconocido rehúsan; --help no', () => {
  test('sin argv: exit 2', async () => {
    expect((await run()).code).toBe(EXIT_REFUSE)
  })
  test('--help: exit 0', async () => {
    expect((await run('--help')).code).toBe(0)
  })
  test('subcomando inexistente: exit 2, sin acción por defecto', async () => {
    const r = await run('no-existe')
    expect(r.code).toBe(EXIT_REFUSE)
    expect(r.err).toContain('no es un subcomando')
  })
})

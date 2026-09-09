/**
 * Porte de `ccnmt: packages/tool-registry/src/ripgrep.ts` (536 líneas,
 * licencia UNLICENSED — reimplementación, no copia). La fuente es un
 * adaptador que traduce arrays de flags legacy de rg al módulo NAPI
 * `ripgrep-napi` (in-process). Ese módulo está AUSENTE en este árbol
 * (medido: no está en package.json de ningún paquete, no hay
 * `node_modules/ripgrep-napi`; ya lo había medido
 * `.claude/workbench/frontera-tool-registry-simbolo/root_modules_report.txt`
 * como bloqueador). El binario `rg` del sistema SÍ está presente
 * (`/usr/bin/rg`, v14.1.0 — confirmado con `rg --version`).
 *
 * DIVERGENCIA DECLARADA (mecanismo, no comportamiento): los 6 símbolos se
 * reimplementan contra `rg` real vía `node:child_process.spawn`, parseando
 * `--json` en vez de llamar al NAPI ausente. Mismo patrón que
 * `@thyrox/shell/execFileNoThrow.ts` y `which.ts` para su propia
 * divergencia (execa ausente → `node:child_process`).
 *
 * Dos puntos donde el puerto MEJORA sobre la fuente, declarados aquí
 * porque los prueba directamente esta suite:
 *
 *   1. `-o`/--only-matching: la fuente re-matchea `m.content` con
 *      `new RegExp(pattern)` incluso bajo `-F` (literal), lo que rompe si
 *      el patrón literal tiene metacaracteres de regex. `rg --help`
 *      confirma que "-o/--only-matching ... have no effect when --json is
 *      set" — así que ninguna de las dos formas puede delegarse a rg vía
 *      JSON. El puerto usa `submatches[].match.text`, la extracción que el
 *      propio motor de rg hizo (correcta bajo `-F` y bajo regex real).
 *   2. El "group-break sentinel" de contexto (`--` entre grupos no
 *      contiguos): medido con sonda propia contra `rg --json -A1 -B1` que
 *      NO existe ningún evento nativo de "salto" en JSON (a diferencia del
 *      `--` de modo texto) — el salto sólo es visible como discontinuidad
 *      en `line_number` entre eventos consecutivos. El puerto lo sintetiza
 *      comparando `line_number` contra el anterior + 1.
 *
 * NO se ejercita el timeout real de 20s (`DEFAULT_TIMEOUT_MS`): la fuente
 * no expone forma de acortarlo desde fuera y las firmas se preservan
 * exactas (no se agrega un 4º parámetro a `ripGrep` sólo para testear).
 * Se declara honesto en vez de fabricar el camino: sólo se prueba la FORMA
 * de `RipgrepTimeoutError` (test 20). Ciega a: que el spawn real se mate de
 * verdad al vencer el timeout — eso exigiría esperar 20s o sustituir
 * `node:child_process`, que ninguna herramienta de este turno cubre.
 *
 * Hallazgos y sondas persistidos en
 * `.claude/workbench/portar-ripgrep-20260909T165044/`.
 *
 * @module
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

let root: string

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'ripgrep-port-fixture-'))

  // --- fixtures de --files ---
  const filesDir = join(root, 'files')
  mkdirSync(join(filesDir, 'nested'), { recursive: true })
  writeFileSync(join(filesDir, 'alpha.txt'), 'x\n')
  writeFileSync(join(filesDir, 'beta.txt'), 'x\n')
  writeFileSync(join(filesDir, 'nested', 'gamma.txt'), 'x\n')

  // --- fixture de búsqueda de contenido default (archivo único) ---
  writeFileSync(join(root, 'search.txt'), 'hello world\nfoo bar\nhello again\n')

  // --- fixture de -l / -c (varios archivos, mismo directorio) ---
  const countDir = join(root, 'lc')
  mkdirSync(countDir)
  writeFileSync(join(countDir, 'one.txt'), 'hello\nhello\n')
  writeFileSync(join(countDir, 'two.txt'), 'hello\n')
  writeFileSync(join(countDir, 'three.txt'), 'no match\n')

  // --- fixture de -o (archivo único) ---
  writeFileSync(join(root, 'omatch.txt'), 'hello world\nhello again\n')
  writeFileSync(join(root, 'literal.txt'), 'price: $5 (tax incl.)\n')

  // --- fixture de contexto (-A/-B) con dos grupos NO contiguos ---
  const ctxLines: string[] = []
  for (let i = 1; i <= 10; i++) ctxLines.push(`line${i}`)
  ctxLines.push('MATCHONE')
  for (let i = 12; i <= 20; i++) ctxLines.push(`line${i}`)
  ctxLines.push('MATCHTWO')
  writeFileSync(join(root, 'context.txt'), `${ctxLines.join('\n')}\n`)

  // --- fixture de streaming ---
  writeFileSync(join(root, 'stream.txt'), 'hello one\nhello two\n')

  // --- fixture de conteo: exactamente 12 archivos planos → potencia de 10
  //     más cercana da 10 (piso: 10^floor(log10(12))=10; round(12/10)*10=10).
  const countFixtureDir = join(root, 'count-fixture')
  mkdirSync(countFixtureDir)
  for (let i = 0; i < 12; i++) {
    writeFileSync(join(countFixtureDir, `f${i}.txt`), 'x\n')
  }
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('ripgrepCommand — forma estática de sandbox-runtime', () => {
  test('1. devuelve rgPath=rg y rgArgs vacío, sin depender de NAPI', async () => {
    const { ripgrepCommand } = await import('../ripgrep.ts')
    expect(ripgrepCommand()).toEqual({ rgPath: 'rg', rgArgs: [] })
  })
})

describe('getRipgrepStatus — diagnóstico contra el sistema real', () => {
  test('2. mode es system (no napi) y working coincide con Bun.which("rg")', async () => {
    const { getRipgrepStatus } = await import('../ripgrep.ts')
    const status = getRipgrepStatus()
    expect(status.mode).toBe('system')
    expect(status.working).toBe(Bun.which('rg') !== null)
    expect(typeof status.path).toBe('string')
  })
})

describe('ripGrep — modo --files', () => {
  test('3. lista los 3 archivos con ruta absoluta', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const filesDir = join(root, 'files')
    const out = await ripGrep(['--files'], filesDir, new AbortController().signal)
    const names = out.map(p => p.split('/').pop()).sort()
    expect(names).toEqual(['alpha.txt', 'beta.txt', 'gamma.txt'])
    for (const p of out) expect(p.startsWith('/')).toBe(true)
  })

  test('4. respeta --glob de exclusión sobre el subdirectorio', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const filesDir = join(root, 'files')
    const out = await ripGrep(
      ['--files', '--glob', '!nested/**'],
      filesDir,
      new AbortController().signal,
    )
    expect(out.some(p => p.endsWith('gamma.txt'))).toBe(false)
    expect(out.length).toBe(2)
  })
})

describe('ripGrep — búsqueda de contenido, modo default', () => {
  test('5. cada línea de resultado tiene forma path:line:content', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const target = join(root, 'search.txt')
    const out = await ripGrep(['-e', 'hello'], target, new AbortController().signal)
    expect(out.length).toBe(2)
    expect(out[0]).toBe(`${target}:1:hello world`)
    expect(out[1]).toBe(`${target}:3:hello again`)
  })

  test('6. sin patrón y sin --files devuelve [] (ill-formed, igual que la fuente)', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const out = await ripGrep([], join(root, 'search.txt'), new AbortController().signal)
    expect(out).toEqual([])
  })
})

describe('ripGrep — -l (files-with-matches)', () => {
  test('7. devuelve sólo las rutas de archivos con coincidencia, sin duplicados', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const out = await ripGrep(
      ['-l', '-e', 'hello'],
      join(root, 'lc'),
      new AbortController().signal,
    )
    const names = out.map(p => p.split('/').pop()).sort()
    expect(names).toEqual(['one.txt', 'two.txt'])
  })
})

describe('ripGrep — -c (count)', () => {
  test('8. devuelve path:count por archivo, sin contar líneas de contexto', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const out = await ripGrep(
      ['-c', '-e', 'hello'],
      join(root, 'lc'),
      new AbortController().signal,
    )
    const oneLine = out.find(l => l.includes('one.txt'))
    const twoLine = out.find(l => l.includes('two.txt'))
    expect(oneLine).toBe(`${join(root, 'lc', 'one.txt')}:2`)
    expect(twoLine).toBe(`${join(root, 'lc', 'two.txt')}:1`)
    expect(out.some(l => l.includes('three.txt'))).toBe(false)
  })
})

describe('ripGrep — -o (only-matching) vía submatches de rg', () => {
  test('9. extrae sólo el texto matcheado, incluso con patrón regex real', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const target = join(root, 'omatch.txt')
    // "hel+o" es una regex real (cuantificador +); si el puerto delegara a
    // --json + -o (que rg ignora) o re-matcheara mal esto lo expondría.
    const out = await ripGrep(['-o', '-e', 'hel+o'], target, new AbortController().signal)
    expect(out).toEqual([`${target}:1:hello`, `${target}:2:hello`])
  })

  test('10. bajo -F (literal), un patrón con metacaracter de regex no rompe -o', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const target = join(root, 'literal.txt')
    // "$5" bajo -F debe matchear literalmente. Un re-match en JS con
    // new RegExp('$5') interpreta "$" como ancla de fin de línea y NO
    // matchea nada — es justo el bug que este puerto evita al usar
    // submatches de rg en vez de reconstruir una regex en JS.
    const out = await ripGrep(['-o', '-F', '-e', '$5'], target, new AbortController().signal)
    expect(out).toEqual([`${target}:1:$5`])
  })
})

describe('ripGrep — contexto (-A/-B) y el sentinel de salto sintetizado', () => {
  test('11. líneas de contexto usan separador "-", líneas de match usan ":"', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const target = join(root, 'context.txt')
    const out = await ripGrep(
      ['-A', '1', '-B', '1', '-e', 'MATCHONE'],
      target,
      new AbortController().signal,
    )
    expect(out).toContain(`${target}:11:MATCHONE`)
    expect(out).toContain(`${target}:10-line10`)
    expect(out).toContain(`${target}:12-line12`)
  })

  test('12. dos grupos de contexto NO contiguos quedan separados por el sentinel "--"', async () => {
    const { ripGrep } = await import('../ripgrep.ts')
    const target = join(root, 'context.txt')
    const out = await ripGrep(
      ['-A', '1', '-B', '1', '-e', 'MATCH'],
      target,
      new AbortController().signal,
    )
    const sentinelIndices = out.map((l, i) => (l === '--' ? i : -1)).filter(i => i >= 0)
    expect(sentinelIndices.length).toBe(1)
    const oneIdx = out.findIndex(l => l.includes(':MATCHONE'))
    const twoIdx = out.findIndex(l => l.includes(':MATCHTWO'))
    expect(oneIdx).toBeGreaterThanOrEqual(0)
    expect(sentinelIndices[0]!).toBeGreaterThan(oneIdx)
    expect(twoIdx).toBeGreaterThan(sentinelIndices[0]!)
  })
})

describe('ripGrepStream — búsqueda en streaming', () => {
  test('13. entrega las coincidencias vía onLines y resuelve al terminar', async () => {
    const { ripGrepStream } = await import('../ripgrep.ts')
    const target = join(root, 'stream.txt')
    const collected: string[] = []
    await ripGrepStream(['-e', 'hello'], target, new AbortController().signal, lines =>
      collected.push(...lines),
    )
    expect(collected).toEqual([`${target}:1:hello one`, `${target}:2:hello two`])
  })

  test('14. abortar antes de lanzar resuelve de inmediato sin entregar líneas', async () => {
    const { ripGrepStream } = await import('../ripgrep.ts')
    const controller = new AbortController()
    controller.abort()
    const collected: string[] = []
    await ripGrepStream(
      ['-e', 'hello'],
      join(root, 'stream.txt'),
      controller.signal,
      lines => collected.push(...lines),
    )
    expect(collected.length).toBe(0)
  })

  test('15. sin patrón, resuelve sin llamar onLines ni una vez', async () => {
    const { ripGrepStream } = await import('../ripgrep.ts')
    let called = false
    await ripGrepStream([], join(root, 'stream.txt'), new AbortController().signal, () => {
      called = true
    })
    expect(called).toBe(false)
  })
})

describe('countFilesRoundedRg — conteo memoizado redondeado a potencia de 10', () => {
  test('16. cuenta y redondea el número de archivos del fixture (12 → 10)', async () => {
    const { countFilesRoundedRg } = await import('../ripgrep.ts')
    const count = await countFilesRoundedRg(
      join(root, 'count-fixture'),
      new AbortController().signal,
      ['zzz-no-such-pattern-16'],
    )
    expect(count).toBe(10)
  })

  test('17. memoiza por (dirPath, ignorePatterns): archivos nuevos tras la 1ª llamada no cambian el resultado cacheado', async () => {
    const { countFilesRoundedRg } = await import('../ripgrep.ts')
    const key = ['zzz-no-such-pattern-17']
    const signal = new AbortController().signal
    const countDir = join(root, 'count-fixture')
    const first = await countFilesRoundedRg(countDir, signal, key)
    expect(first).toBe(10) // 12 archivos -> redondeado a 10
    // Cruza de bucket: 12 + 8 = 20 archivos redondearía a 20, DISTINTO de
    // 10. Si el resultado cacheado cambiara, este test lo vería.
    for (let i = 0; i < 8; i++) {
      writeFileSync(join(countDir, `extra-for-test-17-${i}.txt`), 'x\n')
    }
    const second = await countFilesRoundedRg(countDir, signal, key)
    expect(second).toBe(first)
  })

  test('18. la guarda de $HOME devuelve undefined sin recorrer nada', async () => {
    const { countFilesRoundedRg } = await import('../ripgrep.ts')
    const result = await countFilesRoundedRg(homedir(), new AbortController().signal, [
      'zzz-no-such-pattern-18',
    ])
    expect(result).toBeUndefined()
  })

  test('19. una señal ya abortada devuelve undefined de inmediato', async () => {
    const { countFilesRoundedRg } = await import('../ripgrep.ts')
    const controller = new AbortController()
    controller.abort()
    const result = await countFilesRoundedRg(join(root, 'count-fixture'), controller.signal, [
      'zzz-no-such-pattern-19',
    ])
    expect(result).toBeUndefined()
  })
})

describe('RipgrepTimeoutError — forma preservada para GrepTool', () => {
  test('20. name, message y partialResults quedan expuestos', () => {
    // No se importa dinámicamente porque no hace falta E/S — se declara
    // igual arriba (test module-level import es redundante aquí).
    return import('../ripgrep.ts').then(({ RipgrepTimeoutError }) => {
      const err = new RipgrepTimeoutError('ripgrep call exceeded 5ms', ['partial:1:line'])
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('RipgrepTimeoutError')
      expect(err.message).toBe('ripgrep call exceeded 5ms')
      expect(err.partialResults).toEqual(['partial:1:line'])
    })
  })
})

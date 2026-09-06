/**
 * `@thyrox/cli` — el análisis de argv temprano (TASK-DOCS-0205).
 *
 * Mitad ROJA escrita ANTES del mecanismo: `src/packages/cli/src/argv.ts`
 * no existía todavía. El import de abajo es RELATIVO — ver la nota de
 * `exitCodes.test.ts` sobre por qué (medido: `@thyrox/cli` no resuelve por
 * nombre desde ningún sitio hasta que `src/packages/bun.lock` registre el
 * workspace, y ese archivo no está entre las rutas de este agente).
 *
 * Por qué éste es un REEXPORT y no una reimplementación
 * -------------------------------------------------------
 * La referencia (`claude-code-nestor-monroy-tools`) tampoco reimplementa
 * este mecanismo dentro de su paquete `cli`: `packages/cli/src/entry/
 * mode-dispatch.ts` IMPORTA `eagerParseCliFlag` de
 * `@claude-code-how-works/app-host/cliArgs.js`. Ese es el grafo de
 * dependencia real de la referencia, y thyrox ya tiene el porte verbatim
 * (capa 0, sin divergencias) en `@thyrox/app-host: src/cliArgs.ts`, fechado
 * antes de esta tarea. Reimplementarlo aquí sería la TERCERA copia
 * divergente del mismo mecanismo — la primera y la segunda ya están
 * medidas en el análisis de esta tarea (`arg()` de `harness/bin/harness.ts`
 * y `opcion()` de `binary/bin/binary.ts`, ninguna soporta `--flag=valor`).
 *
 * Este archivo es, de paso, la primera cobertura ejecutable de
 * `@thyrox/app-host: src/cliArgs.ts` en el repo — medido: `grep -rl
 * cliArgs tests/ src/packages/app-host` no encuentra ningún `.test.ts`
 * antes de este archivo.
 */
import { describe, expect, test } from 'bun:test'
import { eagerParseCliFlag, extractArgsAfterDoubleDash } from '../../src/packages/cli/src/argv.ts'

describe('eagerParseCliFlag — reexportado desde @thyrox/app-host, sin divergencia', () => {
  test('forma con espacio: --flag valor', () => {
    expect(eagerParseCliFlag('--settings', ['--settings', '/tmp/x.json'])).toBe('/tmp/x.json')
  })

  test('forma con igual: --flag=valor — la que NI harness.ts NI binary.ts soportan hoy', () => {
    expect(eagerParseCliFlag('--settings', ['--settings=/tmp/x.json'])).toBe('/tmp/x.json')
  })

  test('bandera ausente devuelve undefined, no cadena vacía', () => {
    expect(eagerParseCliFlag('--settings', ['--otra-cosa'])).toBeUndefined()
  })

  test('sin argv explícito usa process.argv (la firma real, no una copia recortada)', () => {
    const original = process.argv
    try {
      process.argv = ['bun', 'harness.ts', '--model', 'claude-opus-5']
      expect(eagerParseCliFlag('--model')).toBe('claude-opus-5')
    } finally {
      process.argv = original
    }
  })
})

describe('extractArgsAfterDoubleDash — reexportado desde @thyrox/app-host', () => {
  test('corrige el `--` que Commander deja como positional', () => {
    const r = extractArgsAfterDoubleDash('--', ['subcomando', '--flag', 'arg'])
    expect(r).toEqual({ command: 'subcomando', args: ['--flag', 'arg'] })
  })

  test('sin `--` de por medio, deja el valor tal cual', () => {
    const r = extractArgsAfterDoubleDash('valor-normal', ['resto'])
    expect(r).toEqual({ command: 'valor-normal', args: ['resto'] })
  })
})

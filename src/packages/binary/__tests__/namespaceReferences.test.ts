/**
 * `references` a través de un NAMESPACE: el consumidor no importa el nombre,
 * importa el módulo entero y accede al miembro.
 *
 * Medido sobre 2.1.283 (2026-09-27): `references chunk-z4sfgzqt.js v` daba
 * 0 usos de `microphoneAuthorizationStatus`, y el módulo de audio SÍ tiene
 * consumidor. `chunk-11jfjeh3.js` lo carga con `r=await import(DEF)` dentro
 * de un cargador `f`, y lo usa como `(await f(o)).isNativeAudioAvailable()` o
 * como `i=await f(n); i.startNativeRecording(…)`. El recorrido sólo seguía
 * `import{x}from`, así que las tres formas le eran invisibles.
 *
 * Los casos 1-3 son una forma cada uno; el 4, que un miembro de OTRO export
 * del namespace no cuenta; el 5 es el control real sobre el corpus.
 *
 * Control de anulación, medido: sin `import*as` cae sólo el 1; sin
 * `import()` caen 2-5 (el cargador y el ligado se derivan de él); sin el
 * cargador, o sin el ligado, caen 3-5; sin el alcance léxico cae sólo el 3,
 * por el homónimo `i` de `unrelated`.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { referencesOf } from '../src/symbol.ts'

const root = mkdtempSync(join(tmpdir(), 'binary-ns-references-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
const DEF = '/$bunfs/root/chunk-def.js'
writeFileSync(join(root, 'chunk-def.js'),
  'function a(){return!0}function b(){return 3}\nexport{a as isAvailable,b as status};\n')
writeFileSync(join(root, 'chunk-static.js'),
  `import*as ns from"${DEF}";function viaStatic(){return ns.isAvailable()}\n`)
writeFileSync(join(root, 'chunk-dynamic.js'),
  `async function viaDynamic(){let m=await import("${DEF}");return m.isAvailable()}\n`)
writeFileSync(join(root, 'chunk-loader.js'),
  `function load(e){return e.p??=(async()=>{let r=await import("${DEF}");return r.isAvailable(),r})(),e.p}\n` +
  'async function viaCall(e){if((await load(e)).isAvailable())return 1}\n' +
  'async function viaBound(e){let i=await load(e),d=i.isAvailable();return d&&i.status()}\n' +
  // Homónimo minificado: otro `i` en otra función, que no es el namespace.
  'function unrelated(){let i={isAvailable(){return!1}};return i.isAvailable()}\n')

const byFile = (name: string) => (r: { file: string }) => r.file === name
const rows = (list: ReturnType<typeof referencesOf>) => list.map(r => [r.file, r.binding])

describe('referencesOf — usos a través de un namespace', () => {
  test('1. import * as ns, y ns.<export>', () => {
    expect(rows(referencesOf(root, 'chunk-def.js', 'a').filter(byFile('chunk-static.js'))))
      .toEqual([['chunk-static.js', 'viaStatic']])
  })

  test('2. await import(DEF) ligado a una variable', () => {
    expect(rows(referencesOf(root, 'chunk-def.js', 'a').filter(byFile('chunk-dynamic.js'))))
      .toEqual([['chunk-dynamic.js', 'viaDynamic']])
  })

  test('3. un cargador que devuelve el namespace, llamado directo o ligado', () => {
    expect(rows(referencesOf(root, 'chunk-def.js', 'a').filter(byFile('chunk-loader.js')))).toEqual([
      ['chunk-loader.js', 'load'],
      ['chunk-loader.js', 'viaCall'],
      ['chunk-loader.js', 'viaBound'],
    ])
  })

  test('4. un miembro de otro export del namespace no cuenta', () => {
    expect(rows(referencesOf(root, 'chunk-def.js', 'b'))).toEqual([['chunk-loader.js', 'viaBound']])
  })
})

describe('control real: el módulo de audio de 2.1.283', () => {
  const corpus = join(import.meta.dir, '..', '..', '..', '..', '_references', 'claude-code-bin', '2.1.283', 'bunfs-root')
  // Los cinco los nombra también `binary literal isNativeAudioAvailable`; la
  // primera versión de este caso esperaba cuatro y el recorrido encontró `we`.
  test('5. isNativeAudioAvailable tiene sus cinco consumidores en chunk-11jfjeh3.js', () => {
    const found = referencesOf(corpus, 'chunk-z4sfgzqt.js', 'c')
      .filter(byFile('chunk-11jfjeh3.js')).map(r => r.binding)
    expect([...new Set(found)].sort()).toEqual(['F', 'f', 'me', 've', 'we'])
  })
})

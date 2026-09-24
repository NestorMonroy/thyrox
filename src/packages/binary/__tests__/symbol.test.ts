import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { extractSymbol, resolveSymbol } from '../src/symbol.ts'

// Sustituye a `probes/extraer.ts` (crecer hasta el primer `}` que parsea):
// un solo análisis por chunk, todas las formas de declaración, el alcance
// de cada definición, y los alias de import/export entre chunks.

describe('extractSymbol', () => {
  test('una función con plantillas que contienen llaves sale entera', () => {
    const src = 'function A(e){return`${e}}{`+"}"}function B(){}'
    expect(extractSymbol(src, 'A').map(d => d.text)).toEqual(['function A(e){return`${e}}{`+"}"}'])
  })

  test('reconoce async, generador, var/let/const y class', () => {
    const src =
      'async function F(){await 1}function* G(){yield 1}var V=(e)=>{return e},W=2;' +
      'let L=function(){};const C=class{};class K{m(){}}'
    const kinds = (n: string) => extractSymbol(src, n).map(d => d.kind)
    expect(kinds('F')).toEqual(['function'])
    expect(kinds('G')).toEqual(['function'])
    expect(extractSymbol(src, 'V')[0]!.text).toBe('V=(e)=>{return e}')
    expect(kinds('V')).toEqual(['variable'])
    expect(kinds('L')).toEqual(['variable'])
    expect(kinds('C')).toEqual(['variable'])
    expect(kinds('K')).toEqual(['class'])
  })

  test('distingue la definición de nivel superior de una anidada con el mismo nombre', () => {
    const src = 'function outer(){function n(){return 1}return n()}function n(){return 2}'
    const found = extractSymbol(src, 'n')
    expect(found.map(d => [d.scope, d.text])).toEqual([
      ['nested', 'function n(){return 1}'],
      ['top', 'function n(){return 2}'],
    ])
  })

  test('reconoce los métodos de clase: normales, async, get/set y campos con función', () => {
    const src =
      'class P{refresh(){return this.scan()}async scan(){return[]}get size(){return 1}' +
      'set size(v){}handler=()=>{return 2}static make(){return new P}}'
    const found = (n: string) => extractSymbol(src, n).map(d => [d.kind, d.scope, d.text])
    expect(found('refresh')).toEqual([['method', 'nested', 'refresh(){return this.scan()}']])
    expect(found('scan')).toEqual([['method', 'nested', 'async scan(){return[]}']])
    expect(found('size').map(d => d[2])).toEqual(['get size(){return 1}', 'set size(v){}'])
    expect(found('handler')).toEqual([['method', 'nested', 'handler=()=>{return 2}']])
    expect(found('make')).toEqual([['method', 'nested', 'static make(){return new P}']])
  })

  test('un nombre ausente da una lista vacía', () => {
    expect(extractSymbol('function A(){}', 'Z')).toEqual([])
  })
})

describe('resolveSymbol', () => {
  const root = mkdtempSync(join(tmpdir(), 'bunfs-'))
  afterAll(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'chunk-a.js'),
    'import{So,Tr as Qa}from"/$bunfs/root/chunk-b.js";function use(){return So()+Qa()}')
  writeFileSync(join(root, 'chunk-b.js'),
    'function So(){return n().host.launchOptions.projectConfigRoot()}function Zq(){return 7}export{So,Zq as Tr};')

  test('sigue un import sin alias hasta su definición', () => {
    const [d] = resolveSymbol(root, 'chunk-a.js', 'So')
    expect([d!.file, d!.name, d!.text]).toEqual([
      'chunk-b.js', 'So', 'function So(){return n().host.launchOptions.projectConfigRoot()}',
    ])
  })

  test('sigue el alias local del import y el alias del export', () => {
    const [d] = resolveSymbol(root, 'chunk-a.js', 'Qa')
    expect([d!.file, d!.name, d!.text]).toEqual(['chunk-b.js', 'Zq', 'function Zq(){return 7}'])
  })

  test('sin definición de nivel superior ni import, cae a los métodos del chunk', () => {
    writeFileSync(join(root, 'chunk-c.js'), 'class I{refreshClients(){return 1}}var refreshClientsX=0;')
    const found = resolveSymbol(root, 'chunk-c.js', 'refreshClients')
    expect(found.map(d => [d.file, d.kind, d.text])).toEqual([['chunk-c.js', 'method', 'refreshClients(){return 1}']])
  })

  test('un símbolo definido en el propio chunk no sale de él', () => {
    const [d] = resolveSymbol(root, 'chunk-a.js', 'use')
    expect([d!.file, d!.name]).toEqual(['chunk-a.js', 'use'])
  })
})

// Control positivo REAL: el caso que se resolvió a mano al verificar los
// portes (H-THYROX-172). `chunk-q2gh92k2.js` importa `So`; su definición vive
// en `chunk-4qqe0nh4.js`.
const CORPUS = join(import.meta.dir, '../../../../_references/claude-code-bin/2.1.275/bunfs-root')
describe.skipIf(!existsSync(join(CORPUS, 'chunk-q2gh92k2.js')))('corpus 2.1.275', () => {
  test('So se resuelve a través de los imports hasta su chunk', () => {
    const [d] = resolveSymbol(CORPUS, 'chunk-q2gh92k2.js', 'So')
    expect([d!.file, d!.text]).toEqual([
      'chunk-4qqe0nh4.js', 'function So(){return n().host.launchOptions.projectConfigRoot()}',
    ])
  })
})

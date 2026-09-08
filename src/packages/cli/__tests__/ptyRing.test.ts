/**
 * El anillo acotado del PTY — el registro que se reproduce al reenganchar.
 *
 * Reimplementación del patrón de `ccnmt: packages/cli/src/bg/ptyRing.ts` y de
 * su suite `__tests__/ptyRing.test.ts`. NO es copia: ccnmt declara
 * `"license": "UNLICENSED"`, así que se porta el mecanismo y el contrato, no
 * su texto (#207).
 *
 * Dos casos de su suite se ENDURECEN aquí, y se declara por qué — los dos son
 * el sub-patrón D de `metrica-decide-la-conclusion.md`, un control cuyo verde
 * no discrimina:
 *
 *  - el suyo comprueba `chunks.length >= 1` para el trozo que solo ya excede
 *    el tope. Eso pasa con cualquier implementación que no borre todo; aquí se
 *    exige además que el contenido sobreviva ÍNTEGRO, que es lo que el
 *    invariante promete.
 *  - el suyo envuelve las aserciones de UTF-8 en `if (head)`. Si `head` fuese
 *    `undefined` el caso pasaría sin medir nada. Aquí se afirma primero que
 *    existe, y sólo entonces se mide.
 */
import { describe, expect, test } from 'bun:test'
import { createRing } from '../src/bg/ptyRing.ts'

/** Cuántos bytes guarda el anillo ahora mismo. */
const bytes = (r: { chunks: Buffer[] }) => r.chunks.reduce((n, c) => n + c.length, 0)
/** Lo que un consumidor leería al reenganchar. */
const joined = (r: { chunks: Buffer[] }) => r.chunks.map(c => c.toString()).join('')

describe('createRing', () => {
  test('por debajo del tope, guarda los trozos intactos y en orden', () => {
    const r = createRing(100)
    r.push(Buffer.from('hola'))
    r.push(Buffer.from(' mundo'))
    expect(r.chunks.map(c => c.toString())).toEqual(['hola', ' mundo'])
  })

  test('al pasar el tope desaloja el mas antiguo, no el mas nuevo', () => {
    const r = createRing(10)
    r.push(Buffer.from('aaaaa'))
    r.push(Buffer.from('bbbbb'))
    r.push(Buffer.from('ccccc'))
    expect(bytes(r)).toBeLessThanOrEqual(10)
    // Que caiga el viejo Y sobreviva el nuevo: la mitad que discrimina es la
    // segunda — un anillo que borrase todo pasaria la primera sola.
    expect(joined(r)).not.toContain('aaaaa')
    expect(joined(r)).toContain('ccccc')
  })

  test('un trozo que solo ya excede el tope sobrevive INTEGRO', () => {
    // Endurecido: la referencia solo pide `length >= 1`. El invariante real es
    // que nunca se pierde el ultimo trozo, asi que se mide su contenido.
    const r = createRing(5)
    const grande = 'un-trozo-mucho-mayor-que-el-tope'
    r.push(Buffer.from(grande))
    expect(joined(r)).toBe(grande)
  })

  test('cien empujes contra un tope pequeno no dejan crecer la lista', () => {
    const r = createRing(50)
    for (let i = 0; i < 100; i++) r.push(Buffer.from(`trozo${i};`))
    expect(r.chunks.length).toBeLessThan(100)
    expect(bytes(r)).toBeLessThanOrEqual(50)
  })

  test('en el tope exacto no desaloja; un byte mas, si', () => {
    const r = createRing(8)
    r.push(Buffer.from('abcdefgh'))
    expect(joined(r)).toBe('abcdefgh')
    r.push(Buffer.from('X'))
    expect(bytes(r)).toBeLessThanOrEqual(8)
    expect(joined(r)).toContain('X')
  })

  test('tras desalojar, la cabeza NO empieza en un byte de continuacion', () => {
    // La salida de un PTY no viene alineada a punto de codigo: al tirar un
    // trozo entero, el siguiente puede empezar a mitad de un caracter. UTF-8
    // admite hasta 3 continuaciones tras un lider de 4 bytes, y ese es el
    // limite del saneo.
    const r = createRing(6)
    r.push(Buffer.from([0x41, 0x42, 0x43, 0x44]))              // "ABCD", se ira
    r.push(Buffer.from([0x80, 0x81, 0x42, 0x43, 0x44]))        // 0x80/0x81 continuan
    const head = r.chunks[0]
    // Endurecido: la referencia mete esto en un `if (head)`, asi que su caso
    // pasaria con `chunks` vacio sin medir nada.
    expect(head).toBeDefined()
    expect(head!.length).toBeGreaterThan(0)
    expect((head![0]! & 0xc0) === 0x80).toBe(false)
  })

  test('leer `chunks` no muta lo que se lee', () => {
    const r = createRing(100)
    r.push(Buffer.from('abc'))
    expect(r.chunks).toEqual(r.chunks)
    expect(joined(r)).toBe('abc')
  })
})

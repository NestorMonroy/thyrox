/**
 * Control de la extraccion (Opcion B, tramo 1: `tasks`).
 *
 * Que haria fallar este control, declarado antes de escribirlo:
 *
 * 1. Que la pieza se hubiera COPIADO en vez de movido. Una copia deja las dos
 *    y divergen en silencio — es el defecto que H-DOCS-1119 midio en los
 *    consumidores. La asercion mira que el origen ya NO exista.
 * 2. Que el paquete nuevo importara del bucle. Eso reintroduciria el ciclo que
 *    la extraccion existe para romper, y el conteo de lineas no lo veria.
 * 3. Que los tres consumidores de `bin/harness.ts` siguieran apuntando al
 *    origen: el paquete existiria y nadie lo usaria.
 * 4. Que la conducta cambiara. Se ejercita `parseRstTasks` con una entrada
 *    real, no con un doble.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PAQUETE = new URL('..', import.meta.url).pathname
const RAIZ = join(PAQUETE, '..', '..', '..')
const HARNESS = join(RAIZ, 'src', 'packages', 'harness')

describe('la extraccion de tasks es un movimiento, no una copia', () => {
  test('el origen ya no existe en harness', () => {
    expect(existsSync(join(HARNESS, 'src', 'tasks'))).toBe(false)
  })

  test('el paquete declara su manifiesto y sus exports', () => {
    const m = JSON.parse(readFileSync(join(PAQUETE, 'package.json'), 'utf8'))
    expect(m.name).toBe('@thyrox/tasks')
    expect(Object.keys(m.exports).sort()).toEqual(['.', './io', './premises', './rst'])
  })

  test('ningun modulo del paquete importa del harness', () => {
    const ofensores: string[] = []
    for (const f of readdirSync(PAQUETE)) {
      if (!f.endsWith('.ts')) continue
      const src = readFileSync(join(PAQUETE, f), 'utf8')
      if (/@thyrox\/harness|\.\.\/harness\//.test(src)) ofensores.push(f)
    }
    expect(ofensores).toEqual([])
    // Y NO puede pasar en vacio: sin modulos, el bucle de arriba no recorre
    // nada y el `toEqual([])` daria verde sobre un paquete inexistente. Es el
    // sub-patron D dentro del propio control — ocurrio al escribirlo.
    expect(readdirSync(PAQUETE).filter((f) => f.endsWith('.ts')).sort())
      .toEqual(['index.ts', 'io.ts', 'premises.ts', 'rst.ts'])
  })

  test('el consumidor real reapunto al paquete', () => {
    const bin = readFileSync(join(HARNESS, 'bin', 'harness.ts'), 'utf8')
    expect(bin).toContain('@thyrox/tasks')
    expect(bin).not.toContain("../src/tasks/")
  })
})

describe('la conducta se preserva', () => {
  test('parseRstTasks sigue leyendo una casilla marcada', async () => {
    const { parseRstTasks } = await import('../rst.ts')
    const filas = parseRstTasks('- [x] T-001 hecho\n- [ ] T-002 pendiente\n')
    expect(filas.length).toBe(2)
    expect(filas[0].done).toBe(true)
    expect(filas[1].done).toBe(false)
  })
})

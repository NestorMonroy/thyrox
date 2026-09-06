/**
 * Control de la DISOLUCIÓN del paquete `@thyrox/tasks` en `src/task/`.
 *
 * Historia, porque el control cambió de sujeto y conviene que se lea: la
 * versión anterior controlaba una EXTRACCIÓN —que `tasks` se hubiera movido
 * del bucle a un paquete propio— y sus aserciones eran correctas para aquella
 * premisa. El análisis de la referencia
 * (`analisis-flujo-de-tareas-en-ccnmt.rst`) midió que la premisa tenía dos
 * mitades y sólo una era falsa: *«el mecanismo no pertenece al bucle»* sigue en
 * pie; *«por tanto es un paquete»* no. Cinco roles alojan el sujeto en
 * dieciocho directorios de la referencia y CERO paquetes llevan su nombre.
 * La corrección es de granularidad, no de dirección.
 *
 * Qué haría fallar este control, declarado antes de reescribirlo:
 *
 * 1. Que la disolución fuera una COPIA. El directorio del paquete seguiría en
 *    pie y las dos copias divergirían en silencio — el defecto que
 *    H-DOCS-1119 midió.
 * 2. Que el manifiesto sobreviviera. Un `package.json` dentro de `src/task/`
 *    reintroduciría el paquete nombrado por el sujeto, que es el defecto
 *    entero.
 * 3. Que la entrada del espacio de trabajo sobreviviera: `bun` resolvería un
 *    paquete inexistente y el error saldría en la instalación, no aquí.
 * 4. Que los consumidores siguieran importando por especificador de paquete.
 * 5. Que los módulos no aterrizaran junto a sus hermanos Python — la forma que
 *    `src/paths/` y `src/store/` ya tienen: una raíz por ROL, con la lengua
 *    que la implemente dentro.
 * 6. Que la conducta cambiara. Se ejercita `parseRstTasks` con una entrada
 *    real, no con un doble.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = new URL('../..', import.meta.url).pathname
const SUJETO = join(RAIZ, 'src', 'task')
const HARNESS = join(RAIZ, 'src', 'packages', 'harness')

describe('la disolución del paquete es un movimiento, no una copia', () => {
  test('el paquete ya no existe', () => {
    expect(existsSync(join(RAIZ, 'src', 'packages', 'tasks'))).toBe(false)
  })

  test('el sujeto NO tiene manifiesto: es un subdirectorio, no un paquete', () => {
    expect(existsSync(join(SUJETO, 'package.json'))).toBe(false)
  })

  test('el espacio de trabajo ya no lo enumera', () => {
    const m = JSON.parse(readFileSync(join(RAIZ, 'src', 'packages', 'package.json'), 'utf8'))
    expect(m.workspaces).not.toContain('tasks')
    // No puede pasar en vacío: si la clave desapareciera, `not.toContain`
    // daría verde sobre `undefined`. Sub-patrón D dentro del propio control.
    expect(m.workspaces.length).toBeGreaterThan(0)
  })

  test('los cuatro módulos viven junto a sus hermanos Python', () => {
    const entradas = readdirSync(SUJETO)
    // Se afirma la PRESENCIA de los cuatro que la disolución movió, no que el
    // directorio tenga exactamente cuatro: el subsistema crece —`schema.ts`
    // llegó con la partición de `tools/tasks.ts`— y una igualdad exacta
    // convertiría cada incorporación legítima en un rojo. Sigue
    // discriminando: si uno de los cuatro desapareciera, cae.
    for (const modulo of ['index.ts', 'io.ts', 'premises.ts', 'rst.ts']) {
      expect(entradas).toContain(modulo)
    }
    // La cohabitación es el punto: es la forma de `src/paths/` y `src/store/`.
    expect(entradas.filter((f) => f.endsWith('.py')).length).toBeGreaterThan(0)
  })

  test('ningún módulo del sujeto importa del harness', () => {
    const ofensores: string[] = []
    for (const f of readdirSync(SUJETO)) {
      if (!f.endsWith('.ts')) continue
      if (/@thyrox\/harness|packages\/harness/.test(readFileSync(join(SUJETO, f), 'utf8'))) {
        ofensores.push(f)
      }
    }
    expect(ofensores).toEqual([])
  })

  test('el consumidor real importa por ruta, no por especificador de paquete', () => {
    const bin = readFileSync(join(HARNESS, 'bin', 'harness.ts'), 'utf8')
    expect(bin).not.toContain('@thyrox/tasks')
    expect(bin).toContain('../../../task/premises.ts')
  })

  test('el harness ya no lo declara como dependencia', () => {
    const m = JSON.parse(readFileSync(join(HARNESS, 'package.json'), 'utf8'))
    expect(Object.keys(m.dependencies ?? {})).not.toContain('@thyrox/tasks')
  })
})

describe('la conducta se preserva', () => {
  test('parseRstTasks sigue leyendo una casilla marcada', async () => {
    const { parseRstTasks } = await import('../../src/task/rst.ts')
    const filas = parseRstTasks('- [x] T-001 hecho\n- [ ] T-002 pendiente\n')
    expect(filas.length).toBe(2)
    expect(filas[0].done).toBe(true)
    expect(filas[1].done).toBe(false)
  })
})

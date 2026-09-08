/**
 * El control de la entrada de la CLI (#205, tramo final).
 *
 * Directiva del ejecutor 2026-09-08: «ya no queremos esto harness.ts». El
 * binario se llamaba `harness.ts` por el paquete `@thyrox/harness`, que se
 * retiro en #226/#266 — el nombre sobrevivio a su sujeto. Y su cuerpo de 666
 * lineas fundia en una cascada de `argv.includes` lo que la referencia reparte
 * en tres capas: `entry/` decide el modo, `commands/` implementa cada uno, y
 * el binario solo arranca.
 *
 * La forma la fija la referencia, medida:
 *
 *   ccnmt: packages/cli/src/entry/{detect-mode,mode-dispatch,run-cli}.ts
 *   ccnmt: packages/cli/src/commands/{version,misc-commands,project-commands}.ts
 *   ccnmt: scripts/verify-entry-thin-host.ts  — el control de «delgado»
 *
 * Dos divergencias declaradas frente a esa fuente:
 *
 *  1. Su `detectRuntimeMode()` **tiene efectos** (empuja el modo a cuatro
 *     setters de estado de arranque) y por eso devuelve `void`. Aqui es
 *     **puro**: `detectMode(argv)` devuelve el descriptor y no toca nada. Sin
 *     estado de arranque global que sembrar, la pureza es gratis, y compra que
 *     el despacho se pueda medir sin arrancar el bucle.
 *  2. Su `mode-dispatch.ts` son 4419 lineas **a proposito**: su docstring
 *     declara que el orden de fases (hooks -> config -> plugins -> MCP -> modo)
 *     es load-bearing y que partirlo arriesga reordenarlo. Aqui esa premisa NO
 *     se cumple: los siete comandos son autocontenidos —cada uno devuelve un
 *     codigo y sale, sin preambulo compartido— asi que la razon para no
 *     partirlo no aplica y se parten.
 *
 * El criterio de «binario delgado» tambien se porta de la referencia, y NO es
 * contar lineas: `verify-entry-thin-host.ts` mide **costuras** — que el punto
 * de entrada cite las que debe y NO cite las que serian logica de dominio.
 * Contar lineas mediria el significante; contar costuras mide el significado.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PKG = join(import.meta.dir, '..')
const BIN = join(PKG, 'bin', 'thyrox.ts')

/** Los siete comandos autocontenidos que hoy viven inline en el binario. */
const COMMANDS = [
  'workbench',
  'selectTests',
  'checkPremises',
  'importTasks',
  'claims',
  'configOrigin',
  'sessions',
] as const

describe('la entrada de la CLI (#205)', () => {
  test('1. el binario ya no se llama por un paquete retirado', () => {
    expect(existsSync(join(PKG, 'bin', 'harness.ts'))).toBe(false)
    expect(existsSync(BIN)).toBe(true)
  })

  test('2. el package.json apunta al binario por su nombre nuevo', () => {
    const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'))
    expect(JSON.stringify(pkg)).not.toContain('bin/harness.ts')
    expect(pkg.bin).toBeDefined()
    expect(Object.values(pkg.bin as Record<string, string>)).toContain('./bin/thyrox.ts')
  })

  test('3. ningun modulo del paquete cita el binario retirado', () => {
    const citas: string[] = []
    const glob = new Bun.Glob('**/*.ts')
    for (const rel of glob.scanSync({ cwd: PKG })) {
      if (rel.includes('node_modules')) continue
      // este control lo NOMBRA en su prosa: se mide el especificador de modulo
      const texto = readFileSync(join(PKG, rel), 'utf8')
      for (const m of texto.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]*bin\/harness[^'"]*)['"]/g)) {
        citas.push(`${rel}: ${m[1]}`)
      }
    }
    expect(citas).toEqual([])
  })

  test('4. el binario es delgado: cita el arranque y NINGUNA logica de dominio', () => {
    const texto = readFileSync(BIN, 'utf8')
    expect(texto).toContain('runCli')
    // Las costuras que serian dominio dentro del punto de entrada. Cada una
    // vive hoy en el binario de 666 lineas; ninguna puede sobrevivir ahi.
    const prohibidas = [
      '@thyrox/agent/loop',
      '@thyrox/provider/anthropicHttp',
      '@thyrox/skills/registry',
      '@thyrox/tools/registry',
      'testing/impact',
      'workbench/manifest',
      'task/premises',
    ]
    expect(prohibidas.filter(s => texto.includes(s))).toEqual([])
  })

  test('5. detectMode es puro: devuelve el modo sin tocar nada', async () => {
    const { detectMode } = await import('../src/entry/detectMode.ts')
    expect(detectMode(['--select-tests']).kind).toBe('selectTests')
    expect(detectMode(['--workbench-check', 'x']).kind).toBe('workbench')
    expect(detectMode(['--sessions']).kind).toBe('sessions')
    expect(detectMode(['--prompt', 'hola']).kind).toBe('loop')
    expect(detectMode([]).kind).toBe('help')
    // puro: dos llamadas con el mismo argv dan el mismo descriptor
    expect(detectMode(['--overlap'])).toEqual(detectMode(['--overlap']))
  })

  test('6. cada comando autocontenido vive en su propio modulo', () => {
    const faltan = COMMANDS.filter(c => !existsSync(join(PKG, 'src', 'commands', `${c}.ts`)))
    expect(faltan).toEqual([])
  })

  test('7. el despacho cubre todos los modos que detectMode puede emitir', async () => {
    const { MODE_KINDS } = await import('../src/entry/detectMode.ts')
    const { HANDLERS } = await import('../src/entry/dispatch.ts')
    expect(Object.keys(HANDLERS).sort()).toEqual([...MODE_KINDS].sort())
  })
})

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
const ENTRY = join(PKG, 'src', 'entry', 'main.ts')

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
  test('1. el punto de entrada se llama como en las DOS referencias', () => {
    // Directiva del ejecutor 2026-09-08: «asegurate que thyrox/src sea lo mas
    // parecido posible a thyrox/_references/restored-src/src/». Medido contra
    // las dos referencias, que aqui COINCIDEN:
    //
    //   restored-src: src/main.tsx                      (v2.1.88, monolitico)
    //   ccnmt:        packages/cli/src/entry/main.tsx   (el mismo, particionado)
    //   directorios `bin/` en cualquiera de las dos: 0
    //
    // La primera version de este control afirmaba `bin/thyrox.ts`. Era una
    // eleccion mia, no de la referencia: ni el nombre ni el directorio salian
    // de una medicion. Se corrige contra lo medido, que es la unica direccion
    // en que una prediccion se corrige.
    expect(existsSync(join(PKG, 'bin'))).toBe(false)
    expect(existsSync(ENTRY)).toBe(true)
  })

  test('2. el package.json no cita el binario retirado', () => {
    const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'))
    // Se miden los campos que INVOCAN —`main`, `bin`, `scripts`, `exports`—,
    // no el manifiesto entero: `description` documenta la retirada y nombrarla
    // ahi es correcto. Medir la cadena suelta prohibiria hablar del sujeto,
    // que es el mismo defecto que el caso 3 corrige leyendo especificadores.
    const ejecutables = JSON.stringify({
      main: pkg.main, bin: pkg.bin, scripts: pkg.scripts, exports: pkg.exports,
    })
    expect(ejecutables).not.toContain('bin/harness.ts')
    // `bin` sigue sin declararse, y NO es un hueco: ningun package.json de
    // ccnmt lo declara (medido: 0 de sus paquetes). El `bin: null` de los tres
    // niveles que #252 nombra es fidelidad a la referencia, no omision.
    expect(pkg.bin).toBeUndefined()
    expect(pkg.exports['./entry/main']).toBe('./src/entry/main.ts')
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

  test('4. el punto de entrada es delgado: cita el arranque y NINGUNA logica de dominio', () => {
    const texto = readFileSync(ENTRY, 'utf8')
    expect(texto).toContain('runCli')
    // Las costuras que serian dominio dentro del punto de entrada. Cada una
    // vivia en el binario de 666 lineas; ninguna puede sobrevivir aqui.
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
    // El modulo se llama `detect-mode.ts` — el nombre EXACTO que la referencia
    // le da (ccnmt: packages/cli/src/entry/detect-mode.ts). Medido: su cli
    // mezcla convenciones (57 % camelCase, 17 % kebab), asi que no hay una
    // sola que copiar; el criterio es que el archivo CON contraparte tome su
    // nombre literal —para que el porte se pueda auditar emparejando nombres—
    // y el que no la tiene use camelCase, su forma dominante.
    const { detectMode } = await import('../src/entry/detect-mode.ts')
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
    const { MODE_KINDS } = await import('../src/entry/detect-mode.ts')
    const { HANDLERS } = await import('../src/entry/mode-dispatch.ts')
    expect(Object.keys(HANDLERS).sort()).toEqual([...MODE_KINDS].sort())
  })
})

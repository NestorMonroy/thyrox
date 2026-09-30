/**
 * `isDangerousRemovalPath`: el contrato de `D4e` del binario 2.1.275.
 *
 * Una ruta es peligrosa de borrar si es un comodín (`*`, `…/*`), la raíz, una
 * raíz o un hijo directo de unidad de Windows, el home —literal o canónico
 * tras resolver enlaces—, o un hijo directo de la raíz. La comparación con el
 * home pliega mayúsculas (`ı` → `i`, `ſ` → `s`) como el binario.
 *
 * Toda guarda lleva su caso negativo contra una ruta REAL fuera del conjunto
 * peligroso: sin él, un `return true` pasaría la suite.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDangerousRemovalPath } from '../pathValidation.ts'

describe('isDangerousRemovalPath — peligrosas', () => {
  test('comodines', () => {
    expect(isDangerousRemovalPath('*')).toBe(true)
    expect(isDangerousRemovalPath('/tmp/*')).toBe(true)
    expect(isDangerousRemovalPath('C:\\Users\\*')).toBe(true)
  })

  test('la raíz y sus hijos directos', () => {
    expect(isDangerousRemovalPath('/')).toBe(true)
    expect(isDangerousRemovalPath('//')).toBe(true)
    expect(isDangerousRemovalPath('/usr')).toBe(true)
    expect(isDangerousRemovalPath('/etc/')).toBe(true)
  })

  test('raíces y hijos directos de unidad', () => {
    expect(isDangerousRemovalPath('C:\\')).toBe(true)
    expect(isDangerousRemovalPath('C:')).toBe(true)
    expect(isDangerousRemovalPath('d:/Windows')).toBe(true)
  })

  // En este contenedor el home es `/root`, hijo directo de la raíz: estos
  // tres casos también los cubre esa guarda, así que no discriminan la de
  // home literal. La discrimina el caso del enlace, más abajo (medido por
  // anulación: sin ella cae sólo ese).
  test('el home, con barra final y con mayúsculas plegadas', () => {
    expect(isDangerousRemovalPath(homedir())).toBe(true)
    expect(isDangerousRemovalPath(homedir() + '/')).toBe(true)
    expect(isDangerousRemovalPath(homedir().toUpperCase())).toBe(true)
  })
})

describe('isDangerousRemovalPath — no peligrosas', () => {
  test('rutas profundas y subdirectorios del home', () => {
    expect(isDangerousRemovalPath('/usr/local/bin')).toBe(false)
    expect(isDangerousRemovalPath(join(homedir(), 'proyecto'))).toBe(false)
    expect(isDangerousRemovalPath(join(import.meta.dir, '..'))).toBe(false)
    expect(isDangerousRemovalPath('C:\\Users\\alguien\\docs')).toBe(false)
  })

  test('un nombre que sólo contiene un asterisco en medio no es comodín final', () => {
    expect(isDangerousRemovalPath('/tmp/a*b/c')).toBe(false)
  })
})

describe('isDangerousRemovalPath — home canónico', () => {
  // Bun fija `homedir()` al arrancar el proceso: reasignar `process.env.HOME`
  // aquí no lo mueve (medido: HOME=/x, luego '/y' → sigue '/x'). El caso se
  // corre en un proceso hijo lanzado con HOME ya apuntando al enlace.
  let base: string
  let real: string

  beforeAll(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'home-canonico-')))
    real = join(base, 'real-home')
    mkdirSync(real)
    symlinkSync(real, join(base, 'link-home'))
  })

  afterAll(() => {
    rmSync(base, { recursive: true, force: true })
  })

  function verdictsWithHomeAt(home: string, paths: string[]): boolean[] {
    const module = join(import.meta.dir, '..', 'pathValidation.ts')
    const script = `import { isDangerousRemovalPath } from ${JSON.stringify(module)}
console.log(JSON.stringify(${JSON.stringify(paths)}.map(isDangerousRemovalPath)))`
    const child = Bun.spawnSync([process.execPath, '-e', script], {
      env: { ...process.env, HOME: home },
    })
    expect(child.exitCode).toBe(0)
    return JSON.parse(child.stdout.toString().trim())
  }

  test('con HOME apuntando a un enlace, su destino real también es el home', () => {
    expect(verdictsWithHomeAt(join(base, 'link-home'), [join(base, 'link-home'), real])).toEqual([true, true])
  })

  test('un hermano del home real no lo es', () => {
    expect(verdictsWithHomeAt(join(base, 'link-home'), [join(base, 'otro')])).toEqual([false])
  })
})

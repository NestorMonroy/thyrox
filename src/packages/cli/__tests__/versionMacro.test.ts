/**
 * La versión de thyrox sale de su propio manifiesto.
 *
 * Antes del renombre, `thyrox --version` imprimía la versión del cliente
 * ANFITRIÓN: leía `CLAUDE_CODE_VERSION`, que el anfitrión fija en el entorno
 * (`2.1.42` en este contenedor). Ese número viaja también en cabeceras y en
 * comprobaciones de compatibilidad, así que thyrox se presentaba con la
 * identidad de otro cliente. Renombrada la lectura, caía al literal de
 * respaldo `1.carus.000`, heredado del porte, que ni siquiera es semver.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGE_DIR = join(import.meta.dir, '..')
const ENTRY = join(PACKAGE_DIR, 'src/entry/cli.tsx')
const MANIFEST_VERSION = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8')).version as string

function versionWith(env: Record<string, string | undefined>): string {
  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== 'THYROX_CODE_VERSION') clean[k] = v
  for (const [k, v] of Object.entries(env)) if (v !== undefined) clean[k] = v
  const p = Bun.spawnSync([process.execPath, 'run', ENTRY, '--version'], { env: clean })
  return new TextDecoder().decode(p.stdout).trim()
}

describe('MACRO.VERSION de la CLI', () => {
  test('sin declarar nada, es la versión del manifiesto de @thyrox/cli', () => {
    expect(MANIFEST_VERSION).toMatch(/^\d+\.\d+\.\d+/)
    expect(versionWith({})).toStartWith(MANIFEST_VERSION)
  })

  test('la versión del cliente anfitrión (CLAUDE_CODE_VERSION) no se hereda', () => {
    expect(versionWith({ CLAUDE_CODE_VERSION: '9.9.9' })).toStartWith(MANIFEST_VERSION) // thyrox-rename: keep — el nombre del anfitrión no gobierna
  })

  test('THYROX_CODE_VERSION la fija una construcción', () => {
    expect(versionWith({ THYROX_CODE_VERSION: '3.4.5' })).toStartWith('3.4.5')
  })
})

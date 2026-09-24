/**
 * El experimento en sombra `tengu_playful_lobster` de 2.1.281
 * (`mi`/`Cr`/`mr`/`pi`, `chunk-mm8vme0b.js`): cuando la lectura se permite
 * por modo (`editImpliesRead`) o por directorio de trabajo (`workingDir`)
 * y el archivo es un enlace duro (`nlink > 1`), se registra
 * `tengu_playful_lobster_fired` una sola vez por `modo:ruta`. No cambia la
 * decisión: sólo mide.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { linkSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getOriginalCwd, setCwdState, setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import { installLocalObservability } from '@thyrox/local-observability'
import { checkReadPermissionForTool } from '../fileToolPermissions.js'
import { resetShadowLoggedPathsForTesting } from '../playfulLobster.js'

let work: string
let previousCwd: string
const events: Array<{ name: string; metadata: Record<string, unknown> }> = []
const Read = { name: 'Read', getPath: (i: { file_path: string }) => i.file_path }
const ctx = (mode = 'default') =>
  ({ mode, additionalWorkingDirectories: new Map(), alwaysAllowRules: {}, alwaysDenyRules: {}, alwaysAskRules: {} }) as never

beforeAll(() => {
  work = realpathSync(mkdtempSync(join(tmpdir(), 'lobster-')))
  mkdirSync(join(work, 'src'))
  writeFileSync(join(work, 'src', 'a.ts'), 'x')
  linkSync(join(work, 'src', 'a.ts'), join(work, 'src', 'b.ts'))
  writeFileSync(join(work, 'src', 'solo.ts'), 'y')
  previousCwd = getOriginalCwd()
  setOriginalCwd(work)
  setCwdState(work)
  installLocalObservability({
    logger: { debug() {}, info() {}, warn() {}, error() {}, event: (name, metadata) => { events.push({ name, metadata: metadata as Record<string, unknown> }) } },
  })
})
afterAll(() => {
  setOriginalCwd(previousCwd)
  setCwdState(previousCwd)
  rmSync(work, { recursive: true, force: true })
})
beforeEach(() => {
  events.length = 0
  resetShadowLoggedPathsForTesting()
})
afterEach(() => { delete process.env.THYROX_FEATURE_FLAGS })

const fired = () => events.filter(e => e.name === 'tengu_playful_lobster_fired')

describe('tengu_playful_lobster (sombra)', () => {
  test('un enlace duro leído por modo registra una vez, sin cambiar la decisión', () => {
    const d = checkReadPermissionForTool(Read as never, { file_path: join(work, 'src', 'b.ts') }, ctx())
    expect(d.behavior).toBe('allow')
    checkReadPermissionForTool(Read as never, { file_path: join(work, 'src', 'b.ts') }, ctx())
    expect(fired()).toEqual([{ name: 'tengu_playful_lobster_fired', metadata: { step: 'workingDir', mode: 'shadow', permissionMode: 'default' } }])
  })
  test('otro modo es otra clave: vuelve a registrar', () => {
    checkReadPermissionForTool(Read as never, { file_path: join(work, 'src', 'a.ts') }, ctx('default'))
    checkReadPermissionForTool(Read as never, { file_path: join(work, 'src', 'a.ts') }, ctx('acceptEdits'))
    // En default la lectura la permite el directorio de trabajo; en acceptEdits,
    // la escritura permitida por modo (editImpliesRead).
    expect(fired().map(e => [e.metadata.permissionMode, e.metadata.step])).toEqual([['default', 'workingDir'], ['acceptEdits', 'editImpliesRead']])
  })
  test('un archivo sin enlace duro no registra', () => {
    checkReadPermissionForTool(Read as never, { file_path: join(work, 'src', 'solo.ts') }, ctx())
    expect(fired()).toEqual([])
  })
  test('con el experimento apagado no registra', () => {
    process.env.THYROX_FEATURE_FLAGS = JSON.stringify({ tengu_playful_lobster: false })
    checkReadPermissionForTool(Read as never, { file_path: join(work, 'src', 'b.ts') }, ctx())
    expect(fired()).toEqual([])
  })
})

/**
 * Con la memoria en pausa, 2.1.281 niega leer y escribir bajo el directorio
 * de memoria automática (`xU`): `vQ` devuelve `qs`, `Mxt` e `ib` devuelven
 * `Rr`. Sin pausa, la misma ruta se permite como memoria automática.
 */
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getOriginalCwd, setCwdState, setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import { installMemoryHostBindings } from '@thyrox/memory'
import { isMemoryPaused, setMemoryPaused } from '@thyrox/memory/memoryPause'
import { clearAutoMemPathCacheForTesting, getAutoMemPath } from '@thyrox/memory/paths'
import { createMemoryHostBindings } from '@thyrox/memory/testing'
import { checkWritePermissionForTool } from '../fileToolPermissions.js'
import { checkEditableInternalPath, checkReadableInternalPath } from '../internalPaths.js'

// La raíz de la memoria automática sale de las ligaduras del anfitrión: se
// apunta a un directorio temporal propio, no al del usuario.
// La memoria cuelga de un árbol `.claude` bajo la raíz del proyecto: así una
// regla de sesión `/.claude/**` (relativa al proyecto) toma el atajo de la
// guarda de escritura, que es lo único que la rama de `ib` intercepta.
let home: string
let previousCwd: string
beforeAll(() => {
  home = realpathSync(mkdtempSync(join(tmpdir(), 'memory-pause-')))
  installMemoryHostBindings(createMemoryHostBindings({ getConfigHomeDir: () => join(home, '.claude'), getProjectRoot: () => home }))
  clearAutoMemPathCacheForTesting()
  previousCwd = getOriginalCwd()
  setOriginalCwd(home)
  setCwdState(home)
})
afterAll(() => {
  setOriginalCwd(previousCwd)
  setCwdState(previousCwd)
})
afterEach(() => setMemoryPaused(false))

const file = () => `${getAutoMemPath()}MEMORY.md`
const READ = 'Cannot read memory while it is paused. Run /pause-memory to resume automemory.'
const WRITE = 'Cannot write to memory while it is paused. Run /pause-memory to resume automemory.'
const REASON = { type: 'safetyCheck', reason: 'memory access blocked by /pause-memory', classifierApprovable: false }

describe('pausa de memoria en las guardas de ruta', () => {
  test('sin pausa, la memoria automática se lee y se edita', () => {
    expect(isMemoryPaused()).toBe(false)
    expect(checkReadableInternalPath(file(), {}).behavior).toBe('allow')
    expect(checkEditableInternalPath(file(), {}).behavior).toBe('allow')
  })
  test('en pausa, leer la memoria se niega (qs)', () => {
    setMemoryPaused(true)
    expect(checkReadableInternalPath(file(), {})).toEqual({ behavior: 'deny', message: READ, decisionReason: REASON })
  })
  test('en pausa, editar la memoria se niega (Rr), aunque no sea .md', () => {
    setMemoryPaused(true)
    expect(checkEditableInternalPath(file(), {})).toEqual({ behavior: 'deny', message: WRITE, decisionReason: REASON })
    expect(checkEditableInternalPath(`${getAutoMemPath()}notes.txt`, {})).toMatchObject({ behavior: 'deny', message: WRITE })
  })
  test('en pausa, la guarda de escritura de la herramienta niega (ib)', () => {
    setMemoryPaused(true)
    const Write = { name: 'Write', getPath: (i: { file_path: string }) => i.file_path }
    const ctx = { mode: 'default', additionalWorkingDirectories: new Map(), alwaysAllowRules: {}, alwaysDenyRules: {}, alwaysAskRules: {} }
    expect(checkWritePermissionForTool(Write as never, { file_path: file() }, ctx as never)).toMatchObject({ behavior: 'deny', message: WRITE })
  })
  test('en pausa, ni una regla de sesión que permite editar la ruta gana (ib va antes)', () => {
    const Write = { name: 'Write', getPath: (i: { file_path: string }) => i.file_path }
    const ctx = {
      mode: 'default', additionalWorkingDirectories: new Map(),
      alwaysAllowRules: { session: ['Edit(/.claude/**)'] }, alwaysDenyRules: {}, alwaysAskRules: {},
    }
    expect(checkWritePermissionForTool(Write as never, { file_path: file() }, ctx as never).behavior).toBe('allow')
    setMemoryPaused(true)
    expect(checkWritePermissionForTool(Write as never, { file_path: file() }, ctx as never)).toMatchObject({ behavior: 'deny', message: WRITE })
  })
})

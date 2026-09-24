/**
 * Inclusiones externas de CLAUDE.md (2.1.275: `Eut`, `yqn`). La raíz de la
 * sesión se fija con el estado de arranque; lo externo se mide contra ella.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { getOriginalCwd, setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import { getExternalClaudeMdIncludes, hasExternalClaudeMdIncludes, type MemoryFileInfo } from '../claudemd.js'

const ROOT = '/work/project'
let previous: string

function file(path: string, type: MemoryFileInfo['type'], parent?: string): MemoryFileInfo {
  return { path, type, content: '', ...(parent && { parent }) }
}

beforeAll(() => {
  previous = getOriginalCwd()
  setOriginalCwd(ROOT)
})
afterAll(() => setOriginalCwd(previous))

describe('getExternalClaudeMdIncludes (Eut)', () => {
  test('una inclusión fuera de la raíz es externa, con su padre', () => {
    const files = [file(`${ROOT}/CLAUDE.md`, 'Project'), file('/elsewhere/shared.md', 'Project', `${ROOT}/CLAUDE.md`)]
    expect(getExternalClaudeMdIncludes(files)).toEqual([{ path: '/elsewhere/shared.md', parent: `${ROOT}/CLAUDE.md` }])
  })
  test('una inclusión dentro de la raíz no lo es', () => {
    expect(getExternalClaudeMdIncludes([file(`${ROOT}/docs/a.md`, 'Project', `${ROOT}/CLAUDE.md`)])).toEqual([])
  })
  test('un archivo sin padre no es una inclusión', () => {
    expect(getExternalClaudeMdIncludes([file('/etc/claude-code/CLAUDE.md', 'Managed')])).toEqual([])
  })
  test('la memoria de usuario no cuenta aunque viva fuera', () => {
    expect(hasExternalClaudeMdIncludes([file('/home/u/.claude/x.md', 'User', '/home/u/.claude/CLAUDE.md')])).toBe(false)
  })
})

/**
 * `getGitStatus` — producción no tiene rama por `NODE_ENV` (ejecutable
 * 2.1.283, `bMn` en `chunk-csayct82.js`: entra directo a
 * `git_status_started`, sin comprobar el entorno). Corre contra el propio
 * repositorio git de este árbol; no hace falta doble.
 */
import { describe, expect, test } from 'bun:test'

import { getGitStatus } from '../context.js'

describe('getGitStatus — sin rama por NODE_ENV', () => {
  test('1. corre el flujo real de git, no el atajo de NODE_ENV=test', async () => {
    const status = await getGitStatus()
    expect(status).not.toBeNull()
    expect(status).toContain('This is the git status at the start of the conversation')
  })
})

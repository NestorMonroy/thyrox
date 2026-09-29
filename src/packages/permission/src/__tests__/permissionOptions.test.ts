/**
 * `isInGlobalConfigFolder` (≙ `Y8t` de 2.1.283): a diferencia del almacén de
 * revisión de settings, este sitio SI usa `homedir()` crudo a proposito —
 * medido en `claude_strings.txt`, su chunk importa `homedir` de `node:os`
 * directamente (`import{homedir as G8t}from"os"`) y lo combina con `.claude`
 * sin pasar por `Se()`/`getConfigHomeDir`. No se cambia a `claudeConfigHome`.
 */
import { describe, expect, test } from 'bun:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { isInGlobalConfigFolder } from '../components/FilePermissionDialog/permissionOptions.tsx'

describe('isInGlobalConfigFolder', () => {
  test('un archivo bajo homedir()/.claude cae dentro', () => {
    expect(isInGlobalConfigFolder(join(homedir(), '.claude', 'settings.json'))).toBe(true)
  })
  test('un archivo fuera de homedir()/.claude no cae dentro', () => {
    expect(isInGlobalConfigFolder(join(homedir(), 'otro-directorio', 'a.txt'))).toBe(false)
  })
})

import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Porte: ccnmt: packages/app-host/src/bootstrap/__tests__/stateNFCNormalization.behavior.test.ts
 * (verbatim en casos, datos y expectativas — cada `expect` aserta contra el
 * TEXTO literal de `../state.ts`, así que el literal ES el contrato; ver
 * cabecera de cobertura en `../state.ts` para el conteo de símbolos
 * portados). Las descripciones de `describe`/`test` se tradujeron al
 * español; los cuerpos (regex, nombres de función citados) quedan
 * idénticos a la fuente.
 *
 * Pin de normalización NFC unicode sobre los cuatro setters de ruta en
 * state.ts.
 *
 * macOS HFS+ guarda los nombres de archivo en NFD (descompuesto); APFS
 * los guarda tal cual se escribieron pero los expone en NFD vía
 * getdirentries() y vía APIs específicas de APFS. El autocompletado de
 * tab de Bash/cd escribe NFC; muchos diálogos "guardar como" de editores
 * escriben NFC.
 *
 * Sin normalización, la misma ruta lógica llega como cadenas distintas
 * según el punto de entrada:
 *   - El usuario escribe `cd ~/Code/résumé` → NFC `résumé`
 *   - Se relee del disco (HFS+) → NFD `résumé`
 *   - Restauración de sesión desde disco → distinto otra vez
 *
 * Pin para que un refactor que quite `.normalize('NFC')` de cualquiera de
 * los cuatro setters (originalCwd, projectRoot, cwdState — y TODOS los
 * helpers relacionados más abajo) quede atrapado.
 */
describe('state.ts — normalización NFC en los setters de rutas', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'state.ts'),
    'utf-8',
  )

  test('setOriginalCwd normaliza a NFC', () => {
    expect(source).toMatch(
      /export function setOriginalCwd\(cwd: string\): void \{[\s\S]*?STATE\.originalCwd = cwd\.normalize\('NFC'\)/,
    )
  })

  test('setProjectRoot normaliza a NFC', () => {
    expect(source).toMatch(
      /export function setProjectRoot\(cwd: string\): void \{[\s\S]*?STATE\.projectRoot = cwd\.normalize\('NFC'\)/,
    )
  })

  test('setCwdState normaliza a NFC', () => {
    expect(source).toMatch(
      /export function setCwdState\(cwd: string\): void \{[\s\S]*?STATE\.cwd = cwd\.normalize\('NFC'\)/,
    )
  })

  test('getProjectRoot devuelve el valor almacenado SIN re-normalizar (inmutable tras el set)', () => {
    // El setter normaliza UNA vez; el getter no debe reprocesar, o las
    // rutas cacheadas se vuelven identificadores inestables.
    const fnStart = source.indexOf('export function getProjectRoot')
    const fnEnd = source.indexOf('\n}', fnStart) + 2
    const fnSlice = source.slice(fnStart, fnEnd)
    expect(fnSlice).toMatch(/return STATE\.projectRoot/)
    expect(fnSlice).not.toContain('.normalize')
  })

  test('el docstring de setProjectRoot advierte sobre EnterWorktreeTool (estabilidad de skills/history)', () => {
    // Pin del docstring — sin esto, un futuro caller podría pensar que es
    // seguro reasignar projectRoot a mitad de sesión, rompiendo el scoping
    // de skills/history.
    expect(source).toMatch(
      /Mid-session EnterWorktreeTool must NOT[\s\S]*?call this[\s\S]*?skills\/history should stay anchored/,
    )
  })
})

import { describe, expect, test } from 'bun:test'

import {
  PROMPT_PREFIX,
  classifyBashCommand,
  createPromptRuleContent,
  extractPromptDescription,
  generateGenericDescription,
  getBashPromptAllowDescriptions,
  getBashPromptAskDescriptions,
  getBashPromptDenyDescriptions,
  isClassifierPermissionsEnabled,
} from '../bashClassifier.ts'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/bashClassifierStub.behavior.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Fija `bashClassifier.ts`, declarado en esta build como un stub sólo-ant.
 *
 * El módulo entero es una cáscara que no hace nada:
 * `isClassifierPermissionsEnabled` devuelve false, todos los getters
 * devuelven arreglos vacíos y `classifyBashCommand` devuelve siempre
 * `matches:false`. Fijarlo impide una activación accidental, que llamaría a
 * APIs sólo-ant que en esta build no existen.
 *
 * Importante: esto NO es código muerto. Las puertas de permiso de ccb llaman
 * a estas funciones en cada invocación de Bash, esperando una semántica de
 * «siempre pasa». Una regresión que devolviera `matches: true` denegaría
 * comandos en falso.
 */
describe('bashClassifier (ANT-only stub)', () => {
  test('PROMPT_PREFIX = "prompt:" (rule format prefix)', () => {
    // Fijado: los archivos de regla usan «prompt: <desc>» para marcar los
    // prompts del clasificador. Una regresión que cambiara el prefijo
    // rompería en silencio la coincidencia de reglas de cualquier archivo de
    // regla de ant que se conserve.
    expect(PROMPT_PREFIX).toBe('prompt:')
  })

  test('isClassifierPermissionsEnabled() is ALWAYS false in this build', () => {
    // Fijado: esta build NO es ant. Devolver true activaría APIs del
    // clasificador que son sólo de ant y aquí no están implementadas.
    expect(isClassifierPermissionsEnabled()).toBe(false)
  })

  test('extractPromptDescription(any) → null in this build', () => {
    // Fijado: es un stub. Una regresión que devolviera una cadena inyectaría
    // descripciones del clasificador en el parseo de reglas.
    expect(extractPromptDescription(undefined)).toBeNull()
    expect(extractPromptDescription('')).toBeNull()
    expect(extractPromptDescription('prompt: foo')).toBeNull()
  })

  test('createPromptRuleContent returns "${PROMPT_PREFIX} ${trimmed}"', () => {
    // Fijado: ésta NO es un stub — construye el contenido de la regla aunque
    // el clasificador esté deshabilitado. El formato tiene que seguir siendo
    // equivalente byte a byte, para que cualquier archivo de regla de ant que
    // se conserve parsee igual en las dos builds.
    expect(createPromptRuleContent('do x')).toBe('prompt: do x')
    expect(createPromptRuleContent('  trim me  ')).toBe('prompt: trim me')
  })

  test('classifyBashCommand always returns matches:false', async () => {
    // Fijado: NUNCA coincide. Una regresión a `matches: true` denegaría todo
    // comando de Bash (el camino del clasificador lo recorre cada invocación
    // de Bash peligrosa).
    const result = await classifyBashCommand(
      'rm -rf /',
      '/tmp',
      ['some description'],
      'deny',
      new AbortController().signal,
      false,
    )
    expect(result.matches).toBe(false)
  })

  test('classifyBashCommand confidence="high" reason="This feature is disabled"', () => {
    // Fijado: la forma del stub. Quien llama mira la confianza para decidir
    // si reintenta; «high» significa «respuesta definitiva, no reintentes».
    return classifyBashCommand(
      'ls',
      '.',
      [],
      'allow',
      new AbortController().signal,
      false,
    ).then(result => {
      expect(result.confidence).toBe('high')
      expect(result.reason).toBe('This feature is disabled')
    })
  })

  test('all three getBashPrompt*Descriptions return []', () => {
    // Fijado: arreglo vacío, NO `undefined`. Quien llama los expande dentro
    // de arreglos de regla — con `undefined` reventaría.
    expect(getBashPromptDenyDescriptions(undefined)).toEqual([])
    expect(getBashPromptAskDescriptions(undefined)).toEqual([])
    expect(getBashPromptAllowDescriptions(undefined)).toEqual([])
  })

  test('generateGenericDescription echoes specific description or null', async () => {
    // Fijado: deja pasar. NO regenera nada — gana la descripción de quien
    // llama.
    const sig = new AbortController().signal
    expect(await generateGenericDescription('rm -rf /', 'wipe', sig)).toBe(
      'wipe',
    )
    expect(await generateGenericDescription('cmd', undefined, sig)).toBeNull()
  })

  test('generateGenericDescription empty string → null (NOT empty string)', async () => {
    // Fijado: `specificDescription || null` — cortocircuito por valor falso.
    const sig = new AbortController().signal
    expect(await generateGenericDescription('cmd', '', sig)).toBeNull()
  })
})

describe('bashClassifier — source pins', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'bashClassifier.ts'),
    'utf-8',
  )

  test('file declares "ANT-ONLY" stub status', () => {
    // Fijado: los marcadores del comentario de cabecera ayudan a que quien
    // llegue entienda por qué todo devuelve un no-op. Un refactor que
    // retirara ese marcador sin convertir el stub en implementación real
    // sería confuso.
    expect(source).toMatch(/Stub for external builds.+ANT-ONLY/i)
  })

  test('matches:false hardcoded in classifyBashCommand', () => {
    expect(source).toMatch(
      /classifyBashCommand[\s\S]+?matches: false/,
    )
  })

  test('classifierPermissionsEnabled returns false literal', () => {
    expect(source).toMatch(
      /isClassifierPermissionsEnabled\(\): boolean \{\s*\n?\s*return false\s*\n?\s*\}/,
    )
  })

  test('no transitive imports of ant-only modules (file is self-contained)', () => {
    // Fijado: NINGUNA sentencia de import, salvo las de tipos. Añadir
    // cualquier import aquí arrastra una dependencia a todas las builds de
    // ccb.
    const importLines = source
      .split('\n')
      .filter(line => /^import /.test(line.trim()))
    expect(importLines).toEqual([])
  })
})

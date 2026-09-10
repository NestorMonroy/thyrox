/**
 * Porte de `ccnmt: packages/command-runtime/src/__tests__/xml.test.ts`.
 *
 * Fija el contrato de las constantes de etiqueta XML (su valor literal, que
 * es lo que un receptor busca en el mensaje) y el de `formatSkillLoadingMetadata`,
 * cuyo formato de tres líneas un renderizador consume aguas abajo.
 */
import { describe, expect, test } from 'bun:test'
import {
  COMMAND_NAME_TAG,
  COMMAND_MESSAGE_TAG,
  COMMAND_ARGS_TAG,
  TERMINAL_OUTPUT_TAGS,
  BASH_INPUT_TAG,
  BASH_STDOUT_TAG,
  BASH_STDERR_TAG,
  LOCAL_COMMAND_STDOUT_TAG,
  LOCAL_COMMAND_STDERR_TAG,
  LOCAL_COMMAND_CAVEAT_TAG,
  COMMON_HELP_ARGS,
  COMMON_INFO_ARGS,
  formatSkillLoadingMetadata,
} from '../xml.js'

describe('constantes de etiqueta XML', () => {
  test('las etiquetas de comando siguen la forma kebab-case', () => {
    expect(COMMAND_NAME_TAG).toBe('command-name')
    expect(COMMAND_MESSAGE_TAG).toBe('command-message')
    expect(COMMAND_ARGS_TAG).toBe('command-args')
  })

  test('TERMINAL_OUTPUT_TAGS contiene las 6 sub-etiquetas de terminal', () => {
    expect(TERMINAL_OUTPUT_TAGS).toEqual([
      BASH_INPUT_TAG,
      BASH_STDOUT_TAG,
      BASH_STDERR_TAG,
      LOCAL_COMMAND_STDOUT_TAG,
      LOCAL_COMMAND_STDERR_TAG,
      LOCAL_COMMAND_CAVEAT_TAG,
    ])
  })

  test('las entradas de TERMINAL_OUTPUT_TAGS son todas únicas', () => {
    expect(new Set(TERMINAL_OUTPUT_TAGS).size).toBe(TERMINAL_OUTPUT_TAGS.length)
  })
})

describe('listas clasificadoras de argumentos comunes', () => {
  test('COMMON_HELP_ARGS incluye los tres patrones canónicos de ayuda', () => {
    expect(COMMON_HELP_ARGS).toEqual(['help', '-h', '--help'])
  })

  test('COMMON_INFO_ARGS contiene verbos de intención de solo lectura', () => {
    expect(COMMON_INFO_ARGS).toContain('list')
    expect(COMMON_INFO_ARGS).toContain('show')
    expect(COMMON_INFO_ARGS).toContain('status')
    expect(COMMON_INFO_ARGS).toContain('?')
  })

  test('COMMON_INFO_ARGS no incluye verbos destructivos (chequeo de regresión)', () => {
    expect(COMMON_INFO_ARGS).not.toContain('delete')
    expect(COMMON_INFO_ARGS).not.toContain('remove')
    expect(COMMON_INFO_ARGS).not.toContain('reset')
  })
})

describe('formatSkillLoadingMetadata', () => {
  test('emite el bloque de metadata de tres líneas (command-message, command-name, skill-format)', () => {
    const out = formatSkillLoadingMetadata('my-skill')
    expect(out).toContain('<command-message>my-skill</command-message>')
    expect(out).toContain('<command-name>my-skill</command-name>')
    expect(out).toContain('<skill-format>true</skill-format>')
  })

  test('separa las líneas con \\n', () => {
    const lines = formatSkillLoadingMetadata('foo').split('\n')
    expect(lines).toHaveLength(3)
  })

  test('maneja nombres de skill con caracteres especiales (no hace HTML-encode)', () => {
    // El cargador de skills inserta el nombre crudo; el renderizador aguas
    // abajo es responsable de escapar si hace falta. Este test fija el
    // comportamiento actual.
    const out = formatSkillLoadingMetadata('a&b<c>')
    expect(out).toContain('<command-message>a&b<c></command-message>')
  })

  test('un nombre de skill vacío produce contenido de etiqueta vacío', () => {
    const out = formatSkillLoadingMetadata('')
    expect(out).toContain('<command-message></command-message>')
  })
})

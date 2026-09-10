/**
 * El sustrato de comandos: la definicion es codigo, el `.md` es su emision.
 *
 * MITAD ROJA. Hoy `src/commands/` son 27 `.md` sueltos: sin tipo, sin emisor
 * y sin destino. Medido antes de escribir nada:
 *
 *   - 27 `.md`, los 27 con frontmatter.
 *   - `.claude/commands/` esta VACIO en thyrox y en kaupamex-docs, y tiene 26
 *     archivos en kaupamex-api y en kaupamex-ui. Los 26 de api son IDENTICOS
 *     byte a byte a los de thyrox; thyrox tiene ademas `loop-analyze.md`.
 *     api y ui difieren entre si (al menos `audit-coherence.md`) — fork por
 *     clon, que es la tarea #191.
 *   - Claves del frontmatter: `description` 26/27, `name` 25/27,
 *     `argument-hint` 3/27, `allowed-tools` 1/27.
 *
 * Y una diferencia con el sustrato de skills que NO se puede heredar sin
 * medirla: alli `name` es el identificador y coincide con el directorio. Aqui
 * `name` es un TITULO HUMANO — `Loop THYROX`, `Test-Driven Development (TDD)`,
 * `Loop de analisis contra la referencia` — y el identificador del comando es
 * el BASENAME del archivo, que es lo que el cliente usa en `/thyrox:track`.
 * Copiar el tipo de skills habria puesto el titulo donde va el id.
 *
 * CONTROL: la ida y vuelta sobre los 27 reales, byte a byte. Puede fallar, y
 * falla exactamente si el emisor pierde una clave, la cita cuando el disco no
 * la cita, o cambia el orden. Un test que solo emitiera un caso fabricado por
 * mi no distinguiria «el emisor es fiel» de «mi ejemplo coincide con mi
 * emisor».
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseCommand } from '../../src/commands/emit/parse.ts'
import { toMarkdown } from '../../src/commands/emit/markdown.ts'
import { COMMANDS_SOURCE_DIR } from '../../src/commands/paths.ts'

const archivos = readdirSync(COMMANDS_SOURCE_DIR).filter((f) => f.endsWith('.md')).sort()

describe('sustrato de comandos', () => {
  test('el corpus medido sigue siendo 27 archivos', () => {
    expect(archivos.length).toBe(27)
  })

  test.each(archivos)('ida y vuelta byte a byte: %s', (archivo) => {
    const enDisco = readFileSync(join(COMMANDS_SOURCE_DIR, archivo), 'utf8')
    const definicion = parseCommand(archivo, enDisco)
    expect(toMarkdown(definicion)).toBe(enDisco)
  })

  test('el id es el basename, no el `name:` del frontmatter', () => {
    const crudo = readFileSync(join(COMMANDS_SOURCE_DIR, 'loop.md'), 'utf8')
    const d = parseCommand('loop.md', crudo)
    expect(d.id).toBe('loop')
    expect(d.name).toBe('Loop THYROX')   // el titulo humano, medido en disco
  })

  test('los dos sin `name:` no lo inventan', () => {
    for (const a of ['permisos-sugeridos.md', 'workflow_init.md']) {
      const d = parseCommand(a, readFileSync(join(COMMANDS_SOURCE_DIR, a), 'utf8'))
      expect(d.name).toBeUndefined()
    }
  })

  test('el unico con allowed-tools lo lleva como lista, y vuelve separado por espacio', () => {
    const d = parseCommand('permisos-sugeridos.md',
      readFileSync(join(COMMANDS_SOURCE_DIR, 'permisos-sugeridos.md'), 'utf8'))
    expect(d.allowedTools).toEqual(['Bash', 'Read', 'Edit'])
  })

  test('la description NO se cita: ninguna de las 26 lleva comillas en disco', () => {
    const d = parseCommand('track.md', readFileSync(join(COMMANDS_SOURCE_DIR, 'track.md'), 'utf8'))
    expect(toMarkdown(d)).toContain(`description: ${d.description}`)
  })
})

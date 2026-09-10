import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AGENTS, migrationPorter, toAgentsJson, toMarkdown } from '../index.ts'
import { agentsDir } from '../../../paths/reach.ts'

// El control lee el hogar por el mismo mecanismo que el emisor escribe. Si
// leyera una ruta propia, los dos podrían divergir sin que nada lo dijera —
// que es exactamente lo que pasó cuando ambos codificaban `.claude/agents/`.
const ON_DISK = join(agentsDir(), 'migration-porter.md')

/** El `updated_at` que el archivo en disco declara hoy. */
function diskUpdatedAt(text: string): string {
  const found = /^updated_at: (.+)$/m.exec(text)
  if (!found) throw new Error('el archivo en disco no declara updated_at')
  return found[1]
}

describe('toMarkdown', () => {
  /**
   * Control POSITIVO REAL del repo, no fabricado: el `.md` que el cliente ya
   * lee. Si el emisor no lo reproduce byte a byte, la definición TS y el
   * artefacto han divergido y el markdown dejaría de ser derivado.
   */
  test('reproduce el artefacto en disco byte a byte', () => {
    const onDisk = readFileSync(ON_DISK, 'utf8')
    expect(toMarkdown(migrationPorter, diskUpdatedAt(onDisk))).toBe(onDisk)
  })

  /**
   * Control NEGATIVO: el de arriba tiene que poder fallar. Sin este caso, un
   * emisor que devolviera el archivo leído del disco pasaría el primero.
   */
  test('difiere cuando la definición cambia', () => {
    const onDisk = readFileSync(ON_DISK, 'utf8')
    const altered = { ...migrationPorter, prompt: migrationPorter.prompt, color: 'magenta' }
    expect(toMarkdown(altered, diskUpdatedAt(onDisk))).not.toBe(onDisk)
  })

  test('omite las claves sin declarar', () => {
    const emitted = toMarkdown(migrationPorter, '2026-01-01 00:00:00')
    // `effort` está sin declarar a propósito (tarea #950).
    expect(emitted).not.toContain('effort:')
    expect(emitted).not.toContain('undefined')
  })

  test('emite experimental.cacheTtl como bloque anidado, sólo si se declara', () => {
    // Clave 20 de 20 del esquema sombra del frontmatter (2.1.258); es la
    // única anidada y la única que el JSON no lleva.
    const withTtl = { ...migrationPorter, prompt: migrationPorter.prompt, experimental: { cacheTtl: '1h' as const } }
    const emitted = toMarkdown(withTtl, '2026-01-01 00:00:00')
    expect(emitted).toContain('experimental:\n  cacheTtl: "1h"\n')
    expect(toMarkdown(migrationPorter, '2026-01-01 00:00:00')).not.toContain('experimental')
  })

  test('cita la descripción de forma que el YAML sobreviva a comillas', () => {
    const withQuote = { ...migrationPorter, description: 'lleva "comillas" y \\ barra' }
    const emitted = toMarkdown(withQuote, '2026-01-01 00:00:00')
    expect(emitted).toContain('description: "lleva \\"comillas\\" y \\\\ barra"')
  })
})

describe('toAgentsJson', () => {
  const registry = toAgentsJson(AGENTS)

  test('el nombre es la clave del registro, no un campo', () => {
    // Se deriva de AGENTS y no de un literal: con un solo agente el literal
    // ['migration-porter'] era cierto, y dejó de serlo al registrar 29 más.
    // La propiedad que se mide no cambia con el conteo: cada clave es un
    // nombre y ningún valor repite el nombre como campo.
    expect(Object.keys(registry).sort()).toEqual(AGENTS.map((a) => a.name).sort())
    for (const key of Object.keys(registry)) {
      expect(registry[key]).not.toHaveProperty('name')
    }
  })

  test('no lleva color: no pertenece al esquema JSON del cliente', () => {
    expect(registry['migration-porter']).not.toHaveProperty('color')
  })

  test('descarta experimental: es del frontmatter, no de AgentJsonSchema', () => {
    const withTtl = { ...migrationPorter, prompt: migrationPorter.prompt, experimental: { cacheTtl: '5m' as const } }
    const only = toAgentsJson([withTtl])
    expect(only['migration-porter']).not.toHaveProperty('experimental')
  })

  test('el prompt viaja resuelto, no como getter', () => {
    const entry = registry['migration-porter'] as { prompt: string }
    expect(typeof entry.prompt).toBe('string')
    expect(entry.prompt.length).toBeGreaterThan(1000)
  })

  test('toda clave emitida pertenece al esquema medido del cliente', () => {
    // Las 15 claves de AgentJsonSchema (H-DOCS-502).
    const SCHEMA_KEYS = new Set([
      'description', 'prompt', 'tools', 'disallowedTools', 'model', 'effort',
      'permissionMode', 'mcpServers', 'hooks', 'maxTurns', 'skills',
      'initialPrompt', 'memory', 'background', 'isolation',
    ])
    for (const entry of Object.values(registry)) {
      for (const key of Object.keys(entry as object)) {
        expect(SCHEMA_KEYS.has(key)).toBe(true)
      }
    }
  })
})

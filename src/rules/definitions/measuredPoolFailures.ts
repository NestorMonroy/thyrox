import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RuleDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Las fallas medidas del pool y de sus suites, con el mecanismo que hoy las
 * rechaza o la tarea que todavía falta.
 *
 * Es de dominio: sólo gobierna a quien toca el pool, sus gates o sus suites,
 * así que se emite con `paths:` y no suma al piso siempre-cargado.
 */
export const measuredPoolFailures: RuleDefinition = {
  name: 'measured-pool-failures',
  scope: 'domain',
  paths: ['src/session/**', 'src/verify/**', 'tests/session/**', 'tests/verify/**', '.githooks/**'],
  get body(): string {
    return readFileSync(join(HERE, 'measuredPoolFailures.body.md'), 'utf8')
  },
}

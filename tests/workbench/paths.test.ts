/**
 * Prueba de `workbench/home` — el hogar del banco es un PARÁMETRO del consumidor.
 *
 * Mitad ROJA escrita antes del mecanismo. El módulo no existe: este archivo
 * falla al importarlo, y ese fallo es el resultado que se persiste.
 *
 * Directiva del ejecutor 2026-09-06: *«todas las que requieran cablear el hogar
 * de algo definiendo una ruta, todas ellas la ruta tiene que ser pasada por una
 * CONSTANTE, y con dos entradas, ambas de entorno … el cablear algo hace que el
 * usuario que usa thyrox pierda la decisión de dónde van las cosas»*.
 *
 * El defecto MEDIDO que lo motiva vive en el árbol:
 * `src/packages/harness/src/workbench/manifest.ts` cablea el hogar en tres
 * sitios —el parámetro se llama `eventosDir`, el `join` asume ese nombre, y
 * `resolve(eventosDir, '..', '..')` asume además su PROFUNDIDAD para escribir
 * `.ruta-del-evento`—. Un consumidor que aloje su banco a otra profundidad
 * obtiene una ruta relativa incorrecta sin que nada falle.
 *
 * Por qué REHÚSA en vez de caer a un default, que es la asimetría con
 * `agentsDir`: aquel resuelve un hogar **de thyrox** —su propio árbol, sobre el
 * que sí decide— y por eso puede tener default. Éste resuelve un hogar **del
 * consumidor**: un default aquí es exactamente la decisión que la directiva
 * retira al emisor. Su docstring en `reach.ts` ya lo dice para `consumerRoot`:
 * *«quien resuelve un artefacto del consumidor no se apoya en el ascenso: exige
 * el valor declarado»*.
 *
 * CONTROL DE ANULACIÓN: si al mecanismo se le añade un default, cae el bloque
 * 4 y sólo ése. Si no cayera, el verde no estaría midiendo la rehusa.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { WORKBENCH_DIR_VAR, WorkbenchHomeError, workbenchDir } from '../../src/workbench/paths.ts'

/** Corre `fn` con el entorno alterado y lo restaura pase lo que pase. */
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const previous: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(vars)) {
    previous[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try { fn() } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

describe('el hogar del banco se declara, no se cablea', () => {
  test('1. la constante nombra la variable, y es una sola', () => {
    expect(WORKBENCH_DIR_VAR).toBe('THYROX_WORKBENCH_DIR')
  })

  test('2. entrada A — la variable del proceso', () => {
    withEnv({ THYROX_WORKBENCH_DIR: '/un/hogar/declarado', THYROX_ENV_FILE: undefined }, () => {
      expect(workbenchDir()).toBe('/un/hogar/declarado')
    })
  })

  test('3. entrada B — la declaración del .env, cuando el proceso calla', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wb-env-'))
    const envFile = join(dir, '.env')
    writeFileSync(envFile, `${WORKBENCH_DIR_VAR}=/hogar/desde/env\n`)
    withEnv({ THYROX_WORKBENCH_DIR: undefined, THYROX_ENV_FILE: envFile }, () => {
      expect(workbenchDir()).toBe('/hogar/desde/env')
    })
  })

  test('3-bis. el proceso gana sobre el .env — es la corrección de una invocación', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wb-prec-'))
    const envFile = join(dir, '.env')
    writeFileSync(envFile, `${WORKBENCH_DIR_VAR}=/pierde\n`)
    withEnv({ THYROX_WORKBENCH_DIR: '/gana', THYROX_ENV_FILE: envFile }, () => {
      expect(workbenchDir()).toBe('/gana')
    })
  })

  test('4. sin ninguna de las dos REHÚSA — no inventa un hogar por el consumidor', () => {
    const vacio = mkdtempSync(join(tmpdir(), 'wb-nada-'))
    withEnv({ THYROX_WORKBENCH_DIR: undefined, THYROX_ENV_FILE: join(vacio, '.env') }, () => {
      expect(() => workbenchDir()).toThrow(WorkbenchHomeError)
    })
  })

  test('5. y al rehusar NOMBRA la constante: rehusar sin decir qué declarar no sirve', () => {
    const vacio = mkdtempSync(join(tmpdir(), 'wb-msg-'))
    withEnv({ THYROX_WORKBENCH_DIR: undefined, THYROX_ENV_FILE: join(vacio, '.env') }, () => {
      expect(() => workbenchDir()).toThrow(WORKBENCH_DIR_VAR)
    })
  })

  test('6. NO verifica que exista: un hogar declarado y ausente es un hecho del consumidor', () => {
    withEnv({ THYROX_WORKBENCH_DIR: '/no/existe/en/disco', THYROX_ENV_FILE: undefined }, () => {
      expect(workbenchDir()).toBe('/no/existe/en/disco')
    })
  })
})

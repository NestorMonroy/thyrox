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
 * REHUSABA, y dejó de hacerlo el 2026-09-07 por directiva del ejecutor:
 * *«a menos que el usuario defina la constante en .env, si no está se tiene que
 * ir a una ruta por default … y si no se declaran thyrox las maneja, porque son
 * necesarias»*. El argumento del rehúse —que un default decide por el
 * consumidor— estaba mal encuadrado: lo prohibido nunca fue tener default, fue
 * **derivarlo por aritmética de la ruta del archivo**, que es lo que el defecto
 * medido de `manifest.ts` hacía. Un default salido de la cadena declarada no
 * tiene ese vicio, y `agentStorePath` ya lo hacía así.
 *
 * Y el rehúse no era neutral: empujaba a teclear la ruta a mano, que es como
 * once bancos aterrizaron en el árbol del proveedor (L-028).
 *
 * CONTROL DE ANULACIÓN: si el mecanismo dejara de leer el entorno y devolviera
 * siempre el default, caen los bloques 2, 3, 3-bis y 5. Si no cayeran, el verde
 * no estaría midiendo la precedencia.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { thyroxRoot } from '../../src/paths/reach.ts'
import { WORKBENCH_DIR_VAR, WorkbenchHomeError, evidenceDir, stateDir, workbenchDir } from '../../src/workbench/paths.ts'

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

  test('4. sin ninguna de las dos cae al default de la cadena declarada', () => {
    const vacio = mkdtempSync(join(tmpdir(), 'wb-nada-'))
    withEnv({ THYROX_WORKBENCH_DIR: undefined, THYROX_ENV_FILE: join(vacio, '.env') }, () => {
      // Cambió por directiva del ejecutor 2026-09-07: sin declaración cae a un
      // default de la cadena declarada, no rehúsa. Ver L-028 y `declarations.py`.
      // `start` en un arbol sin `.claude` para que el ascenso de
      // `consumerRoot` no aterrice en el PROVEEDOR. Sin el, este caso medía el
      // default compuesto DENTRO de thyrox — que es el defecto L-028, no su
      // ausencia. La mitad Python ya pasaba su temporal por `start`.
      const home = workbenchDir(vacio)
      expect(home.endsWith(`${stateDir(vacio)}/${evidenceDir(vacio)}`)).toBe(true)
    })
  })

  test('5. el default NO es silencioso: la constante sigue ganando sobre él', () => {
    // Medía que el rehúse nombrara la constante. Ya no hay rehúse — pero la
    // pregunta que ese caso protegía sigue viva: ¿el mecanismo sabe leer la
    // declaración, o devuelve el default pase lo que pase? Sin este control,
    // el caso 4 pasaría igual con una función que ignorase el entorno.
    const vacio = mkdtempSync(join(tmpdir(), 'wb-msg-'))
    withEnv({ THYROX_WORKBENCH_DIR: undefined, THYROX_ENV_FILE: join(vacio, '.env') }, () => {
      const porDefecto = workbenchDir(vacio)
      withEnv({ THYROX_WORKBENCH_DIR: '/declarado/a/mano' }, () => {
        expect(workbenchDir(vacio)).toBe('/declarado/a/mano')
        expect(workbenchDir(vacio)).not.toBe(porDefecto)
      })
    })
  })

  // El caso que esta suite declaraba ciego hasta el 2026-09-09. Los casos 2, 3
  // y 6 declaran rutas ABSOLUTAS, que `resolveHome` devuelve sin mirar el
  // ancla: pasaban igual con el ancla resuelta, rota o inexistente. Sólo una
  // RELATIVA obliga a componer, y sólo entonces importa qué hace el mecanismo
  // cuando la raíz del consumidor no se puede saber.
  //
  // La respuesta es «devolverla CRUDA», no rehusar: el llamador ve la ruta que
  // declaró en vez de una compuesta contra un árbol que este módulo eligió por
  // su cuenta. Paridad con la mitad Python, que captura `ConsumerUnknownError`.
  test('6-bis. declarada RELATIVA y sin raíz de consumidor resoluble → cruda', () => {
    // Partir de dentro del PROVEEDOR: el ascenso aterriza en thyrox y
    // `consumerRoot` rehúsa, que es la única forma de llegar aquí.
    const dentroDelProveedor = join(thyroxRoot(), 'src', 'paths')
    withEnv({
      THYROX_WORKBENCH_DIR: 'hogar-relativo',
      THYROX_CONSUMER: undefined,
      THYROX_ENV_FILE: undefined,
    }, () => {
      expect(workbenchDir(dentroDelProveedor)).toBe('hogar-relativo')
    })
  })

  // CONTROL DE ANULACIÓN de 6-bis. Sin él, aquel caso pasaría igual con un
  // mecanismo que devolviera SIEMPRE el valor crudo — el defecto home-by-cwd
  // que #284/#286 cerraron. Con raíz resoluble, la misma relativa SE COMPONE.
  test('6-ter. la misma relativa SÍ se compone cuando hay raíz resoluble', () => {
    const consumidor = mkdtempSync(join(tmpdir(), 'wb-consumidor-'))
    withEnv({
      THYROX_WORKBENCH_DIR: 'hogar-relativo',
      THYROX_CONSUMER: consumidor,
      THYROX_ENV_FILE: undefined,
    }, () => {
      expect(workbenchDir()).toBe(join(consumidor, 'hogar-relativo'))
    })
  })

  test('6. NO verifica que exista: un hogar declarado y ausente es un hecho del consumidor', () => {
    withEnv({ THYROX_WORKBENCH_DIR: '/no/existe/en/disco', THYROX_ENV_FILE: undefined }, () => {
      expect(workbenchDir()).toBe('/no/existe/en/disco')
    })
  })
})

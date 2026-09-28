/**
 * Prueba de `workbench/home` — el hogar del banco es un PARÁMETRO del consumidor.
 *
 * Toda ruta que cablea un hogar pasa por una CONSTANTE con dos entradas, ambas
 * de entorno: cablearla a mano quitaría al usuario de thyrox la decisión de
 * dónde van las cosas.
 *
 * Lo prohibido no es tener default: es **derivarlo por aritmética de la ruta
 * del archivo** (asumir el nombre y la PROFUNDIDAD del directorio para
 * componer una relativa). Un consumidor que alojara su banco a otra
 * profundidad obtendría una ruta incorrecta sin que nada falle. Sin
 * declaración, el hogar cae a un default de la cadena declarada, como
 * `agentStorePath`; rehusar empujaría a teclear la ruta a mano, que es como
 * los bancos aterrizan en el árbol del proveedor (L-028).
 *
 * CONTROL DE ANULACIÓN: si el mecanismo dejara de leer el entorno y devolviera
 * siempre el default, caen los bloques 2, 3, 3-bis y 5. Si no cayeran, el verde
 * no estaría midiendo la precedencia.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { thyroxRoot } from '@thyrox/paths/reach.ts'
import { WORKBENCH_DIR_VAR, evidenceDir, stateDir, workbenchDir } from '../paths.ts'

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
      // Sin declaración cae a un default de la cadena declarada, no rehúsa.
      // Ver L-028 y `declarations.py`.
      // `start` en un arbol sin `.claude` para que el ascenso de
      // `consumerRoot` no aterrice en el PROVEEDOR. Sin el, este caso medía el
      // default compuesto DENTRO de thyrox — que es el defecto L-028, no su
      // ausencia. La mitad Python pasa su temporal por `start` igual.
      const home = workbenchDir(vacio)
      expect(home.endsWith(`${stateDir(vacio)}/${evidenceDir(vacio)}`)).toBe(true)
    })
  })

  test('5. el default NO es silencioso: la constante sigue ganando sobre él', () => {
    // ¿El mecanismo sabe leer la declaración, o devuelve el default pase lo
    // que pase? Sin este control,
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

  // Los casos 2, 3 y 6 declaran rutas ABSOLUTAS, que `resolveHome` devuelve sin mirar el
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

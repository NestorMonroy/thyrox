/**
 * La contraparte TS de `src/paths/reach.py`, acotada a lo que un consumidor
 * de TypeScript necesita hoy: la raíz de thyrox y el hogar de los artefactos
 * de agente.
 *
 * PORTE PARCIAL DECLARADO. De los símbolos de `reach.py` se portan tres
 * —`env_file_path`, `env_value`, `thyrox_root`— y se añade uno que la mitad
 * Python no tiene consumidor para declarar: `agentsDir()`. NO se portan
 * `tree_root`, `root`, `roots`, `extra_roots`, `clone_name(s)`, `env_names`
 * ni `reach`: nombran el árbol de clones `kaupamex-*`, y ningún `.ts` de este
 * paquete los consulta. Portarlos sin consumidor sería fabricar superficie.
 *
 * El defecto que cierra: los 12 `.ts` que resuelven su raíz por aritmética de
 * ruta (`'..','..','..','..'`) — la misma forma que el docstring de
 * `reach.py` declara que **falla en silencio** al mover el archivo un nivel.
 * Ya falló: el renombre que llevó `.claude/agents/` a `src/agents/definitions/`
 * dejó atrás dos rutas codificadas y el control byte a byte llevaba semanas
 * en rojo apuntando a un directorio inexistente.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  agentsDir, AGENTS_DIR_VAR, cloneName, cloneNames, envNames, envValue, root, roots,
  THYROX_ROOT_VAR, thyroxRoot, treeRoot,
} from '../../src/paths/reach.ts'

const guardado = { ...process.env }
const temporales: string[] = []

afterEach(() => {
  for (const k of Object.keys(process.env)) if (!(k in guardado)) delete process.env[k]
  Object.assign(process.env, guardado)
  for (const d of temporales.splice(0)) rmSync(d, { recursive: true, force: true })
})

function raizTemporal(): string {
  const d = mkdtempSync(join(tmpdir(), 'reach-ts-'))
  temporales.push(d)
  return d
}

describe('envValue — el proceso gana al archivo', () => {
  test('devuelve el valor del proceso sin mirar el .env', () => {
    const raiz = raizTemporal()
    writeFileSync(join(raiz, '.env'), 'MI_VAR=del-archivo\n', 'utf8')
    process.env.MI_VAR = 'del-proceso'
    expect(envValue('MI_VAR', raiz)).toBe('del-proceso')
  })

  test('cae al .env cuando el proceso no la declara', () => {
    const raiz = raizTemporal()
    writeFileSync(join(raiz, '.env'), 'MI_VAR=del-archivo\n', 'utf8')
    delete process.env.MI_VAR
    expect(envValue('MI_VAR', raiz)).toBe('del-archivo')
  })

  test('devuelve null cuando ninguna de las dos entradas la declara', () => {
    delete process.env.MI_VAR
    expect(envValue('MI_VAR', raizTemporal())).toBeNull()
  })
})

describe('thyroxRoot — variable declarada, después ascenso por el marcador', () => {
  test('la variable declarada gana', () => {
    const raiz = raizTemporal()
    process.env[THYROX_ROOT_VAR] = raiz
    expect(thyroxRoot()).toBe(raiz)
  })

  test('sin variable, asciende hasta el directorio que lleva el marcador', () => {
    delete process.env[THYROX_ROOT_VAR]
    const encontrada = thyroxRoot()
    expect(existsSync(join(encontrada, 'src', 'paths', 'reach.py'))).toBe(true)
  })

  /** El control que discrimina: sin marcador y sin variable, rehúsa. */
  test('rehúsa en vez de devolver una ruta inventada', () => {
    delete process.env[THYROX_ROOT_VAR]
    expect(() => thyroxRoot(raizTemporal())).toThrow(/THYROX_ROOT/)
  })
})

describe('agentsDir — el hogar es un parámetro, no un literal', () => {
  test('la variable declarada gana sobre el hogar propio', () => {
    const raiz = raizTemporal()
    process.env[AGENTS_DIR_VAR] = raiz
    expect(agentsDir()).toBe(raiz)
  })

  /**
   * El hogar por defecto NO es obligatorio declararlo: sin variable, resuelve
   * al de thyrox mismo. Es la decisión de diseño que `litellm` demuestra
   * viable — un producto configurable entero por entorno y usable sin config.
   */
  test('sin variable, resuelve al hogar de thyrox y ese hogar existe', () => {
    delete process.env[AGENTS_DIR_VAR]
    delete process.env[THYROX_ROOT_VAR]
    const dir = agentsDir()
    expect(dir.endsWith(join('src', 'agents', 'definitions'))).toBe(true)
    expect(existsSync(dir)).toBe(true)
  })

  /**
   * El control que faltó y dejó dos rutas en rojo semanas: el hogar resuelto
   * tiene que contener de verdad los artefactos que el emisor escribe.
   */
  test('el hogar por defecto contiene los .md de agente que el emisor escribe', () => {
    delete process.env[AGENTS_DIR_VAR]
    expect(existsSync(join(agentsDir(), 'migration-porter.md'))).toBe(true)
  })

  test('un hogar declarado que no existe se reporta, no se inventa', () => {
    process.env[AGENTS_DIR_VAR] = join(raizTemporal(), 'no-existe')
    expect(existsSync(agentsDir())).toBe(false)
  })
})

/**
 * El tramo del árbol de clones, que el porte parcial declaraba NO portado
 * «porque ningún `.ts` de este paquete lo consulta». Ya lo consulta:
 * `src/paths/docs.ts` resuelve la raíz de `kaupamex-docs` y hasta hoy lo hacía
 * con su PROPIA cadena (`KAUPAMEX_DOCS_ROOT` + ascenso a `source/gestion/pm`),
 * que es una segunda fuente de verdad para la misma decisión.
 *
 * `porte-completo-no-parcial.md`: un porte parcial declarado se completa
 * cuando aparece su consumidor, no se deja con la nota.
 */
describe('el tramo del árbol de clones — completa el porte parcial', () => {
  test('cloneName antepone el prefijo; una raíz desconocida se rechaza', () => {
    expect(cloneName('docs')).toBe('kaupamex-docs')
    expect(() => cloneName('inventada')).toThrow(/raíz desconocida/)
  })

  test('cloneNames da las cinco declaradas, en su orden', () => {
    expect(cloneNames()).toEqual([
      'kaupamex-api', 'kaupamex-db', 'kaupamex-docs', 'kaupamex-server', 'kaupamex-ui',
    ])
  })

  test('envNames da las dos grafías por raíz, la del lector primero', () => {
    expect(envNames('docs')).toEqual(['THYROX_REACH_DOCS', 'KAUPAMEX_DOCS'])
    expect(envNames('api')).toEqual(['THYROX_REACH_API', 'KAUPAMEX_API'])
  })

  test('treeRoot: gana la primera grafía declarada', () => {
    process.env.THYROX_REACH_ROOT = '/arbol/uno'
    process.env.KAUPAMEX_ROOT = '/arbol/dos'
    expect(treeRoot()).toBe('/arbol/uno')
    delete process.env.THYROX_REACH_ROOT
    expect(treeRoot()).toBe('/arbol/dos')
  })

  test('treeRoot: sin variable, asciende hasta el nivel que tiene un clon', () => {
    const arbol = raizTemporal()
    mkdirSync(join(arbol, 'kaupamex-docs', 'hondo', 'mas'), { recursive: true })
    delete process.env.THYROX_REACH_ROOT
    delete process.env.KAUPAMEX_ROOT
    expect(treeRoot(join(arbol, 'kaupamex-docs', 'hondo', 'mas'))).toBe(arbol)
  })

  test('treeRoot: sin variable y sin clon en ningún nivel, lanza', () => {
    const huerfano = raizTemporal()
    delete process.env.THYROX_REACH_ROOT
    delete process.env.KAUPAMEX_ROOT
    expect(() => treeRoot(huerfano)).toThrow(/no se pudo derivar el padre de los clones/)
  })

  test('root: la variable por raíz gana sobre el árbol', () => {
    process.env.THYROX_REACH_ROOT = '/arbol'
    process.env.THYROX_REACH_DOCS = '/otro/sitio/docs'
    expect(root('docs')).toBe('/otro/sitio/docs')
    expect(root('api')).toBe(join('/arbol', 'kaupamex-api'))
  })

  test('root: la grafía heredada por raíz también se lee', () => {
    process.env.THYROX_REACH_ROOT = '/arbol'
    process.env.KAUPAMEX_DOCS = '/heredado/docs'
    expect(root('docs')).toBe('/heredado/docs')
  })

  test('roots da las cinco resueltas contra el árbol', () => {
    process.env.THYROX_REACH_ROOT = '/arbol'
    expect(roots()).toEqual({
      api: '/arbol/kaupamex-api', db: '/arbol/kaupamex-db', docs: '/arbol/kaupamex-docs',
      server: '/arbol/kaupamex-server', ui: '/arbol/kaupamex-ui',
    })
  })
})

/**
 * TDD del resto de `@thyrox/config/env/utils.ts` — pase de 2026-09-09
 * («completar `env/utils.ts` sobre la excepción declarada»; sin task
 * asignada en el encargo — `TASK-DOCS-0200`/`TASK-DOCS-0250` citados en un
 * borrador previo de este docstring NO corresponden a este trabajo, medido
 * contra `agent_store.sqlite3` (0200 = censar tengu_team_mem_*; 0250 =
 * re-encuadre de un catálogo documental) — retirados). Cierra los 13
 * exports que faltaban de los 18 de la fuente (`ccnmt:
 * packages/config/env/utils.ts`, 224 líneas, licencia UNLICENSED —
 * reimplementación, no copia). Sin dependencias transitivas nuevas: los 13
 * sólo usan `process.env`/`process.argv` y los cinco ya portados
 * (`isEnvTruthy`, `getClaudeConfigHomeDir`).
 *
 * `getPermissionHostBindings`-style no aplica aquí — no hay shim de host,
 * son lectores/escritores puros de `process.env`. El riesgo real es la
 * MUTACIÓN GLOBAL: `process.env` y `setCheckProtectedNamespaceFn` son
 * estado de proceso compartido con el resto de la suite de `config`, así
 * que cada bloque restaura lo que tocó.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  deleteEnv,
  getAWSRegion,
  getClaudeConfigHomeDir,
  getDefaultVertexRegion,
  getTeamsDir,
  getVertexRegionForModel,
  hasNodeOption,
  isBareMode,
  isInProtectedNamespace,
  isRunningOnHomespace,
  parseEnvVars,
  setCheckProtectedNamespaceFn,
  setEnv,
  shouldMaintainProjectWorkingDir,
} from '../env/utils.ts'

/** Guarda/restaura un subconjunto de `process.env` entre tests — evita que
 * una variable mutada en un caso contamine los siguientes de este archivo o
 * los de otros archivos que corran después en el mismo proceso `bun test`. */
function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {}
  for (const key of Object.keys(vars)) previous[key] = process.env[key]
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    fn()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

describe('getTeamsDir', () => {
  test('anida "teams" bajo getClaudeConfigHomeDir', () => {
    withEnv({ CLAUDE_CONFIG_DIR: '/tmp/config-envutils-teams' }, () => {
      expect(getTeamsDir()).toBe(`${getClaudeConfigHomeDir()}/teams`)
      expect(getTeamsDir().endsWith('/teams')).toBe(true)
    })
  })
})

describe('hasNodeOption', () => {
  afterEach(() => {
    delete process.env.NODE_OPTIONS
  })

  test('encuentra un flag exacto entre varios separados por espacio', () => {
    process.env.NODE_OPTIONS = '--foo --bar=1 --baz'
    expect(hasNodeOption('--foo')).toBe(true)
    expect(hasNodeOption('--bar=1')).toBe(true)
  })

  test('NO hace match parcial — evita falsos positivos', () => {
    process.env.NODE_OPTIONS = '--foobar'
    expect(hasNodeOption('--foo')).toBe(false)
  })

  test('sin NODE_OPTIONS declarada: false', () => {
    delete process.env.NODE_OPTIONS
    expect(hasNodeOption('--foo')).toBe(false)
  })
})

describe('isBareMode', () => {
  afterEach(() => {
    delete process.env.CLAUDE_CODE_SIMPLE
  })

  test('CLAUDE_CODE_SIMPLE truthy activa el modo', () => {
    process.env.CLAUDE_CODE_SIMPLE = '1'
    expect(isBareMode()).toBe(true)
  })

  test('sin la variable y sin --bare en argv: false', () => {
    delete process.env.CLAUDE_CODE_SIMPLE
    expect(process.argv.includes('--bare')).toBe(false)
    expect(isBareMode()).toBe(false)
  })
})

describe('parseEnvVars', () => {
  test('parsea pares KEY=value', () => {
    expect(parseEnvVars(['FOO=1', 'BAR=baz'])).toEqual({ FOO: '1', BAR: 'baz' })
  })

  test('un "=" dentro del valor no lo trunca', () => {
    expect(parseEnvVars(['FOO=a=b=c'])).toEqual({ FOO: 'a=b=c' })
  })

  test('undefined da objeto vacío', () => {
    expect(parseEnvVars(undefined)).toEqual({})
  })

  test('sin "=" lanza', () => {
    expect(() => parseEnvVars(['SOLO_CLAVE'])).toThrow()
  })
})

describe('getAWSRegion / getDefaultVertexRegion', () => {
  test('AWS_REGION gana sobre AWS_DEFAULT_REGION y sobre el default', () => {
    withEnv({ AWS_REGION: 'eu-west-1', AWS_DEFAULT_REGION: 'us-west-2' }, () => {
      expect(getAWSRegion()).toBe('eu-west-1')
    })
  })

  test('sin ninguna de las dos: us-east-1', () => {
    withEnv({ AWS_REGION: undefined, AWS_DEFAULT_REGION: undefined }, () => {
      expect(getAWSRegion()).toBe('us-east-1')
    })
  })

  test('CLOUD_ML_REGION gana sobre el default us-east5', () => {
    withEnv({ CLOUD_ML_REGION: 'europe-west1' }, () => {
      expect(getDefaultVertexRegion()).toBe('europe-west1')
    })
    withEnv({ CLOUD_ML_REGION: undefined }, () => {
      expect(getDefaultVertexRegion()).toBe('us-east5')
    })
  })
})

describe('shouldMaintainProjectWorkingDir', () => {
  test('delega en isEnvTruthy sobre CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR', () => {
    withEnv({ CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR: 'true' }, () => {
      expect(shouldMaintainProjectWorkingDir()).toBe(true)
    })
    withEnv({ CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR: undefined }, () => {
      expect(shouldMaintainProjectWorkingDir()).toBe(false)
    })
  })
})

describe('isRunningOnHomespace', () => {
  test('exige USER_TYPE=ant Y COO_RUNNING_ON_HOMESPACE truthy — las dos', () => {
    withEnv({ USER_TYPE: 'ant', COO_RUNNING_ON_HOMESPACE: 'true' }, () => {
      expect(isRunningOnHomespace()).toBe(true)
    })
    withEnv({ USER_TYPE: 'human', COO_RUNNING_ON_HOMESPACE: 'true' }, () => {
      expect(isRunningOnHomespace()).toBe(false)
    })
    withEnv({ USER_TYPE: 'ant', COO_RUNNING_ON_HOMESPACE: undefined }, () => {
      expect(isRunningOnHomespace()).toBe(false)
    })
  })
})

describe('setCheckProtectedNamespaceFn / isInProtectedNamespace', () => {
  afterEach(() => {
    // Neutraliza el singleton de módulo al respaldo por defecto de la
    // fuente (`() => false`) — no filtra a otros archivos de esta suite.
    setCheckProtectedNamespaceFn(() => false)
    delete process.env.USER_TYPE
  })

  test('fuera de USER_TYPE=ant, siempre false — el probe NUNCA se consulta', () => {
    let consultado = false
    setCheckProtectedNamespaceFn(() => {
      consultado = true
      return true
    })
    withEnv({ USER_TYPE: 'human' }, () => {
      expect(isInProtectedNamespace()).toBe(false)
    })
    expect(consultado).toBe(false)
  })

  test('con USER_TYPE=ant, delega en el probe instalado', () => {
    setCheckProtectedNamespaceFn(() => true)
    withEnv({ USER_TYPE: 'ant' }, () => {
      expect(isInProtectedNamespace()).toBe(true)
    })
  })

  test('respaldo por defecto (sin instalar nada): false', () => {
    withEnv({ USER_TYPE: 'ant' }, () => {
      expect(isInProtectedNamespace()).toBe(false)
    })
  })
})

describe('getVertexRegionForModel', () => {
  afterEach(() => {
    delete process.env.VERTEX_REGION_CLAUDE_HAIKU_4_5
    delete process.env.CLOUD_ML_REGION
  })

  test('sin modelo: el default de Vertex', () => {
    expect(getVertexRegionForModel(undefined)).toBe('us-east5')
  })

  test('modelo sin override conocido: el default de Vertex', () => {
    expect(getVertexRegionForModel('claude-nuevo-modelo-x')).toBe('us-east5')
  })

  test('modelo con override + env var declarada: la env var gana', () => {
    process.env.VERTEX_REGION_CLAUDE_HAIKU_4_5 = 'asia-northeast1'
    expect(getVertexRegionForModel('claude-haiku-4-5')).toBe('asia-northeast1')
  })

  test('modelo con override pero SIN env var: cae al default de Vertex', () => {
    delete process.env.VERTEX_REGION_CLAUDE_HAIKU_4_5
    expect(getVertexRegionForModel('claude-haiku-4-5')).toBe('us-east5')
  })

  test('el prefijo más específico gana sobre uno más corto', () => {
    // 'claude-opus-4-1' antes que 'claude-opus-4' en la lista de la fuente
    // — un modelo 'claude-opus-4-1-preview' NO debe resolver contra la
    // entrada genérica 'claude-opus-4'.
    process.env.VERTEX_REGION_CLAUDE_4_1_OPUS = 'us-central1'
    expect(getVertexRegionForModel('claude-opus-4-1-preview')).toBe('us-central1')
    delete process.env.VERTEX_REGION_CLAUDE_4_1_OPUS
  })
})

describe('setEnv / deleteEnv', () => {
  afterEach(() => {
    delete process.env.THYROX_ENVUTILS_TEST_VAR
  })

  test('setEnv asigna, deleteEnv borra', () => {
    setEnv('THYROX_ENVUTILS_TEST_VAR', 'valor')
    expect(process.env.THYROX_ENVUTILS_TEST_VAR).toBe('valor')
    deleteEnv('THYROX_ENVUTILS_TEST_VAR')
    expect(process.env.THYROX_ENVUTILS_TEST_VAR).toBeUndefined()
  })
})

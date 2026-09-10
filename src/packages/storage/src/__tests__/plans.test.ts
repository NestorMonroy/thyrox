import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { writeFileSync } from 'fs'
import { mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  clearAllPlanSlugs,
  clearPlanSlug,
  copyPlanForFork,
  copyPlanForResume,
  getPlan,
  getPlanFilePath,
  getPlanSlug,
  getPlansDirectory,
  persistFileSnapshotIfRemote,
  setInitialSettingsForTest,
  setPlanSlug,
  type LogOption,
} from '../plans.js'
import { setGetCwdFn } from '../internal/pendingCrossPackageDeps.js'
import { setSessionId } from '../sessionPaths.js'

let configDir: string
const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR
const ORIGINAL_ENV_KIND = process.env.CLAUDE_CODE_ENVIRONMENT_KIND

// `getCwd()` (de `./internal/pendingCrossPackageDeps.js`) es un singleton
// de proceso que otros archivos de test (p. ej. `path.test.ts`) también
// sobreescriben SIN restaurar al terminar — `setGetCwdFn` fija aquí un
// valor propio y determinista en vez de asumir el `process.cwd()`
// ambiente, para no depender del orden en que bun ejecute los archivos.
const FAKE_CWD = '/home/user/cwd-de-prueba-plans'

beforeEach(async () => {
  configDir = await mkdtemp(join(tmpdir(), 'plans-'))
  process.env.CLAUDE_CONFIG_DIR = configDir
  delete process.env.CLAUDE_CODE_ENVIRONMENT_KIND
  setInitialSettingsForTest({})
  setGetCwdFn(() => FAKE_CWD)
  clearAllPlanSlugs()
})

afterEach(async () => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR
  if (ORIGINAL_ENV_KIND === undefined) delete process.env.CLAUDE_CODE_ENVIRONMENT_KIND
  else process.env.CLAUDE_CODE_ENVIRONMENT_KIND = ORIGINAL_ENV_KIND
  setInitialSettingsForTest({})
  setGetCwdFn(() => process.cwd())
  clearAllPlanSlugs()
  await rm(configDir, { recursive: true, force: true })
})

describe('getPlansDirectory', () => {
  test('sin settings, usa CLAUDE_CONFIG_DIR/plans y lo crea', async () => {
    const dir = getPlansDirectory()
    expect(dir).toBe(join(configDir, 'plans'))
    expect((await stat(dir)).isDirectory()).toBe(true)
  })

  test('con plansDirectory relativo DENTRO de la raíz del proyecto, lo usa', () => {
    setInitialSettingsForTest({ plansDirectory: '.mis-planes' })
    const dir = getPlansDirectory()
    expect(dir).toBe(join(FAKE_CWD, '.mis-planes'))
  })

  test('con plansDirectory que escapa la raíz del proyecto (traversal), cae al default', () => {
    setInitialSettingsForTest({ plansDirectory: '../fuera-del-proyecto' })
    const dir = getPlansDirectory()
    expect(dir).toBe(join(configDir, 'plans'))
  })
})

describe('getPlanSlug / setPlanSlug / clearPlanSlug / clearAllPlanSlugs', () => {
  test('genera un slug con forma adjetivo-verbo-sustantivo y lo cachea', () => {
    setSessionId('sesion-slug-1')
    const slug = getPlanSlug()
    expect(slug).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/)
    expect(getPlanSlug()).toBe(slug)
  })

  test('setPlanSlug fija un slug explícito que getPlanSlug respeta después', () => {
    setPlanSlug('sesion-explicita', 'mi-slug-fijo')
    expect(getPlanSlug('sesion-explicita')).toBe('mi-slug-fijo')
  })

  test('clearPlanSlug hace que la siguiente llamada genere uno nuevo', () => {
    setPlanSlug('sesion-a-limpiar', 'slug-viejo')
    clearPlanSlug('sesion-a-limpiar')
    expect(getPlanSlug('sesion-a-limpiar')).not.toBe('slug-viejo')
  })

  test('si el slug generado ya tiene archivo, reintenta con otro', () => {
    // Crea archivos para TODAS las combinaciones adjetivo-verbo-sustantivo
    // salvo una — el reintento debe converger en la única libre.
    const dir = getPlansDirectory()
    const libre = 'brave-climbs-badger'
    // No podemos enumerar las ~4096 combinaciones sin conocerlas todas;
    // en su lugar verificamos que, si el slug candidato YA tiene
    // archivo, getPlanSlug no lo reusa — creando el archivo del PRIMER
    // slug calculado tras fijar una sesión distinta como control.
    void libre
    setSessionId('sesion-colision')
    const primerIntento = getPlanSlug()
    clearPlanSlug('sesion-colision')
    // Bloquea ese slug con un archivo existente.
    writeFileSync(join(dir, `${primerIntento}.md`), 'ocupado')
    const segundoIntento = getPlanSlug()
    expect(segundoIntento).not.toBe(primerIntento)
  })
})

describe('getPlanFilePath / getPlan', () => {
  test('sin agentId, es {slug}.md bajo el directorio de planes', () => {
    setSessionId('sesion-path-1')
    const slug = getPlanSlug()
    expect(getPlanFilePath()).toBe(join(getPlansDirectory(), `${slug}.md`))
  })

  test('con agentId, es {slug}-agent-{id}.md', () => {
    setSessionId('sesion-path-2')
    const slug = getPlanSlug()
    expect(getPlanFilePath('subagente-42')).toBe(
      join(getPlansDirectory(), `${slug}-agent-subagente-42.md`),
    )
  })

  test('getPlan lee el contenido cuando el archivo existe', async () => {
    setSessionId('sesion-contenido-1')
    const path = getPlanFilePath()
    await writeFile(path, '# Mi plan\n')
    expect(getPlan()).toBe('# Mi plan\n')
  })

  test('getPlan devuelve null cuando el archivo no existe, sin lanzar', () => {
    setSessionId('sesion-sin-archivo')
    expect(getPlan()).toBeNull()
  })
})

describe('copyPlanForResume', () => {
  function logCon(slug: string): LogOption {
    return { messages: [{ type: 'user', slug }] }
  }

  test('sin slug en el log, devuelve false', async () => {
    expect(await copyPlanForResume({ messages: [] }, 'sesion-x')).toBe(false)
  })

  test('con slug y archivo existente, devuelve true y fija el slug para la sesión destino', async () => {
    setInitialSettingsForTest({})
    const dir = getPlansDirectory()
    await writeFile(join(dir, 'slug-existente.md'), '# plan')

    const ok = await copyPlanForResume(logCon('slug-existente'), 'sesion-resume-1')
    expect(ok).toBe(true)
    expect(getPlanSlug('sesion-resume-1')).toBe('slug-existente')
  })

  test('archivo faltante y SIN entorno remoto, devuelve false sin intentar recuperar', async () => {
    const ok = await copyPlanForResume(logCon('slug-nunca-existio'), 'sesion-resume-2')
    expect(ok).toBe(false)
  })

  test('archivo faltante, entorno remoto, recupera desde snapshot de archivo', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    const log: LogOption = {
      messages: [
        { type: 'user', slug: 'slug-recuperado-snap' },
        {
          type: 'system',
          subtype: 'file_snapshot',
          snapshotFiles: [
            { key: 'plan', path: '/no/importa', content: '# desde snapshot' },
          ],
        },
      ],
    }

    const ok = await copyPlanForResume(log, 'sesion-resume-3')
    expect(ok).toBe(true)
    const dir = getPlansDirectory()
    expect(await readFile(join(dir, 'slug-recuperado-snap.md'), 'utf-8')).toBe(
      '# desde snapshot',
    )
  })

  test('archivo faltante, entorno remoto, recupera desde tool_use de ExitPlanMode', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    const log: LogOption = {
      messages: [
        {
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: 'ExitPlanMode', input: { plan: '# desde tool_use' } },
            ],
          },
        },
        { type: 'user', slug: 'slug-recuperado-tooluse' },
      ],
    }

    const ok = await copyPlanForResume(log, 'sesion-resume-4')
    expect(ok).toBe(true)
    const dir = getPlansDirectory()
    expect(await readFile(join(dir, 'slug-recuperado-tooluse.md'), 'utf-8')).toBe(
      '# desde tool_use',
    )
  })

  test('archivo faltante, entorno remoto, recupera desde planContent de un mensaje de usuario', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    const log: LogOption = {
      messages: [
        { type: 'user', planContent: '# desde planContent' },
        { type: 'user', slug: 'slug-recuperado-plancontent' },
      ],
    }

    const ok = await copyPlanForResume(log, 'sesion-resume-5')
    expect(ok).toBe(true)
  })

  test('archivo faltante, entorno remoto, recupera desde attachment plan_file_reference', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    const log: LogOption = {
      messages: [
        {
          type: 'attachment',
          attachment: { type: 'plan_file_reference', planContent: '# desde attachment' },
        },
        { type: 'user', slug: 'slug-recuperado-attachment' },
      ],
    }

    const ok = await copyPlanForResume(log, 'sesion-resume-6')
    expect(ok).toBe(true)
  })

  test('archivo faltante, entorno remoto, SIN nada que recuperar devuelve false', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    const ok = await copyPlanForResume(
      logCon('slug-sin-recuperacion-posible'),
      'sesion-resume-7',
    )
    expect(ok).toBe(false)
  })
})

describe('copyPlanForFork', () => {
  test('sin slug en el log, devuelve false', async () => {
    expect(await copyPlanForFork({ messages: [] }, 'sesion-fork-x')).toBe(false)
  })

  test('con el original presente, copia a un slug NUEVO (no reusa el original)', async () => {
    const dir = getPlansDirectory()
    await writeFile(join(dir, 'slug-original.md'), '# plan original')

    const ok = await copyPlanForFork(
      { messages: [{ type: 'user', slug: 'slug-original' }] },
      'sesion-fork-1',
    )
    expect(ok).toBe(true)

    const nuevoSlug = getPlanSlug('sesion-fork-1')
    expect(nuevoSlug).not.toBe('slug-original')
    expect(await readFile(join(dir, `${nuevoSlug}.md`), 'utf-8')).toBe(
      '# plan original',
    )
    // El original sigue intacto — no se movió.
    expect(await readFile(join(dir, 'slug-original.md'), 'utf-8')).toBe(
      '# plan original',
    )
  })

  test('con el original ausente, devuelve false', async () => {
    const ok = await copyPlanForFork(
      { messages: [{ type: 'user', slug: 'slug-jamas-existio' }] },
      'sesion-fork-2',
    )
    expect(ok).toBe(false)
  })
})

describe('persistFileSnapshotIfRemote', () => {
  test('sin entorno remoto, resuelve sin tocar disco', async () => {
    await expect(persistFileSnapshotIfRemote()).resolves.toBeUndefined()
  })

  test('con entorno remoto pero sin plan, resuelve (nada que snapshotear)', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    setSessionId('sesion-snapshot-vacio')
    await expect(persistFileSnapshotIfRemote()).resolves.toBeUndefined()
  })

  test('con entorno remoto y un plan existente, no lanza — recordTranscript aún no existe en este árbol', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    setSessionId('sesion-snapshot-con-plan')
    await writeFile(getPlanFilePath(), '# un plan')
    // recordTranscript (./sessionStorage.js) no está portado todavía —
    // la llamada revienta internamente y se captura; el llamador no ve
    // el error (ver docstring del archivo).
    await expect(persistFileSnapshotIfRemote()).resolves.toBeUndefined()
  })
})

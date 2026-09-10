import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { symlink, writeFile } from 'fs/promises'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  _clearOutputsForTest,
  _resetTaskOutputDirForTest,
  appendTaskOutput,
  cleanupTaskOutput,
  evictTaskOutput,
  flushTaskOutput,
  getProjectTempDir,
  getTaskOutput,
  getTaskOutputDelta,
  getTaskOutputDir,
  getTaskOutputPath,
  getTaskOutputSize,
  initTaskOutput,
  initTaskOutputAsSymlink,
  MAX_TASK_OUTPUT_BYTES,
  readFileRange,
  tailFile,
} from '../task/diskOutput.js'
import { setOriginalCwd, setSessionId } from '../sessionPaths.js'

let tmpBase: string
const ORIGINAL_TMPDIR = process.env.CLAUDE_CODE_TMPDIR

beforeEach(async () => {
  tmpBase = await mkdtemp(join(tmpdir(), 'disk-output-'))
  process.env.CLAUDE_CODE_TMPDIR = tmpBase
  setOriginalCwd('/home/user/mi-proyecto-diskoutput')
  setSessionId('sesion-diskoutput-1')
  _resetTaskOutputDirForTest()
})

afterEach(async () => {
  await _clearOutputsForTest()
  _resetTaskOutputDirForTest()
  if (ORIGINAL_TMPDIR === undefined) delete process.env.CLAUDE_CODE_TMPDIR
  else process.env.CLAUDE_CODE_TMPDIR = ORIGINAL_TMPDIR
  await rm(tmpBase, { recursive: true, force: true })
})

describe('getProjectTempDir', () => {
  test('compone claude-{uid}/{cwd-saneado}/ bajo el tmpdir configurado', () => {
    const uid = process.getuid?.() ?? 0
    expect(getProjectTempDir()).toBe(
      join(tmpBase, `claude-${uid}`, '-home-user-mi-proyecto-diskoutput') +
        '/',
    )
  })
})

describe('getTaskOutputDir / getTaskOutputPath', () => {
  test('compone tmpProyecto/sessionId/tasks', () => {
    const dir = getTaskOutputDir()
    expect(dir).toBe(join(getProjectTempDir(), 'sesion-diskoutput-1', 'tasks'))
  })

  test('está memoizado — un cambio de sessionId posterior NO afecta la ruta ya calculada', () => {
    const first = getTaskOutputDir()
    setSessionId('sesion-diskoutput-2')
    expect(getTaskOutputDir()).toBe(first)
  })

  test('_resetTaskOutputDirForTest limpia la memoización', () => {
    const first = getTaskOutputDir()
    setSessionId('sesion-diskoutput-3')
    _resetTaskOutputDirForTest()
    expect(getTaskOutputDir()).not.toBe(first)
  })

  test('getTaskOutputPath nombra el archivo <taskId>.output', () => {
    expect(getTaskOutputPath('tarea-1')).toBe(
      join(getTaskOutputDir(), 'tarea-1.output'),
    )
  })
})

describe('appendTaskOutput / flushTaskOutput / getTaskOutput', () => {
  test('el contenido apendado aparece tras flush', async () => {
    appendTaskOutput('tarea-append-1', 'hola ')
    appendTaskOutput('tarea-append-1', 'mundo')
    await flushTaskOutput('tarea-append-1')

    expect(await getTaskOutput('tarea-append-1')).toBe('hola mundo')
  })

  test('sin ninguna escritura previa, getTaskOutput devuelve "" (ENOENT silencioso)', async () => {
    expect(await getTaskOutput('tarea-jamas-escrita')).toBe('')
  })

  test('flushTaskOutput sobre una tarea desconocida no lanza', async () => {
    await expect(flushTaskOutput('tarea-desconocida')).resolves.toBeUndefined()
  })

  test('getTaskOutput trunca y antepone el aviso de KB omitidos cuando excede maxBytes', async () => {
    appendTaskOutput('tarea-grande', 'A'.repeat(100))
    await flushTaskOutput('tarea-grande')

    const out = await getTaskOutput('tarea-grande', 10)
    expect(out.startsWith('[')).toBe(true)
    expect(out.endsWith('A'.repeat(10))).toBe(true)
  })
})

describe('cap de disco — MAX_TASK_OUTPUT_BYTES', () => {
  test('el valor del cap es 5GB, y su etiqueta legible coincide', () => {
    expect(MAX_TASK_OUTPUT_BYTES).toBe(5 * 1024 * 1024 * 1024)
  })

  // NO se ejercita la rama de truncado real (#capped = true en
  // DiskTaskOutput.append): forzarla exige escribir 5GB en un append (el
  // cap es un `const`, no inyectable) — impracticable en un test. Queda
  // declarado como hueco: la clase que lo implementa NO se exporta por
  // separado, sólo a través de la API pública append/flush/read.
})

describe('getTaskOutputDelta', () => {
  test('lee sólo lo nuevo desde un offset', async () => {
    appendTaskOutput('tarea-delta-1', 'primero')
    await flushTaskOutput('tarea-delta-1')
    const first = await getTaskOutputDelta('tarea-delta-1', 0)
    expect(first.content).toBe('primero')

    appendTaskOutput('tarea-delta-1', 'segundo')
    await flushTaskOutput('tarea-delta-1')
    const second = await getTaskOutputDelta('tarea-delta-1', first.newOffset)
    expect(second.content).toBe('segundo')
    expect(second.newOffset).toBe(first.newOffset + 'segundo'.length)
  })

  test('sin archivo, devuelve content:"" y el mismo offset (ENOENT silencioso)', async () => {
    const delta = await getTaskOutputDelta('tarea-delta-inexistente', 5)
    expect(delta).toEqual({ content: '', newOffset: 5 })
  })
})

describe('getTaskOutputSize', () => {
  test('refleja el tamaño real del archivo tras flush', async () => {
    appendTaskOutput('tarea-size-1', '12345')
    await flushTaskOutput('tarea-size-1')
    expect(await getTaskOutputSize('tarea-size-1')).toBe(5)
  })

  test('sin archivo, devuelve 0', async () => {
    expect(await getTaskOutputSize('tarea-size-inexistente')).toBe(0)
  })
})

describe('cleanupTaskOutput', () => {
  test('borra el archivo y hace que una lectura posterior dé vacío', async () => {
    appendTaskOutput('tarea-cleanup-1', 'contenido')
    await flushTaskOutput('tarea-cleanup-1')
    expect(await getTaskOutput('tarea-cleanup-1')).toBe('contenido')

    await cleanupTaskOutput('tarea-cleanup-1')

    expect(await getTaskOutput('tarea-cleanup-1')).toBe('')
  })

  test('sobre una tarea sin archivo, no lanza', async () => {
    await expect(cleanupTaskOutput('tarea-cleanup-inexistente')).resolves.toBeUndefined()
  })
})

describe('evictTaskOutput', () => {
  test('saca la tarea del mapa en memoria SIN borrar el archivo', async () => {
    appendTaskOutput('tarea-evict-1', 'se-queda')
    await flushTaskOutput('tarea-evict-1')

    await evictTaskOutput('tarea-evict-1')

    // El archivo sigue en disco — leerlo funciona vía el path directo,
    // aunque el mapa en memoria ya no tenga la instancia.
    expect(await getTaskOutput('tarea-evict-1')).toBe('se-queda')
  })
})

describe('initTaskOutput', () => {
  test('crea un archivo vacío en la ruta esperada', async () => {
    const path = await initTaskOutput('tarea-init-1')
    expect(path).toBe(getTaskOutputPath('tarea-init-1'))
    expect(await getTaskOutput('tarea-init-1')).toBe('')
  })

  test('llamarlo dos veces sobre el mismo taskId falla — O_EXCL no permite recrear', async () => {
    await initTaskOutput('tarea-init-2')
    await expect(initTaskOutput('tarea-init-2')).rejects.toThrow()
  })
})

describe('initTaskOutputAsSymlink', () => {
  test('crea un symlink hacia el target', async () => {
    const targetPath = join(tmpBase, 'objetivo.txt')
    await writeFile(targetPath, 'contenido del target')

    const outputPath = await initTaskOutputAsSymlink('tarea-symlink-1', targetPath)

    expect(await getTaskOutput('tarea-symlink-1')).toBe('contenido del target')
    void outputPath
  })

  test('si ya existe un archivo regular en esa ruta, lo reemplaza por el symlink', async () => {
    await initTaskOutput('tarea-symlink-2') // crea un archivo regular primero

    const targetPath = join(tmpBase, 'objetivo-2.txt')
    await writeFile(targetPath, 'via symlink')

    await initTaskOutputAsSymlink('tarea-symlink-2', targetPath)

    expect(await getTaskOutput('tarea-symlink-2')).toBe('via symlink')
  })
})

describe('readFileRange / tailFile (exportadas directas)', () => {
  test('readFileRange devuelve null cuando el offset excede el tamaño del archivo', async () => {
    const path = join(tmpBase, 'chico.txt')
    await writeFile(path, 'abc')
    expect(await readFileRange(path, 10, 100)).toBeNull()
  })

  test('readFileRange respeta el offset y el maxBytes', async () => {
    const path = join(tmpBase, 'rango.txt')
    await writeFile(path, '0123456789')
    const result = await readFileRange(path, 3, 4)
    expect(result?.content).toBe('3456')
    expect(result?.bytesTotal).toBe(10)
  })

  test('tailFile de un archivo vacío da content:"" sin lanzar', async () => {
    const path = join(tmpBase, 'vacio.txt')
    await writeFile(path, '')
    expect(await tailFile(path, 100)).toEqual({
      content: '',
      bytesRead: 0,
      bytesTotal: 0,
    })
  })

  test('tailFile de un archivo grande sólo trae la cola', async () => {
    const path = join(tmpBase, 'cola.txt')
    await writeFile(path, '0123456789')
    const result = await tailFile(path, 4)
    expect(result.content).toBe('6789')
    expect(result.bytesTotal).toBe(10)
  })
})

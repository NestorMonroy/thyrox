import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  SUPERVISOR_LOG_ROTATION_THRESHOLD_BYTES,
  closeSupervisorLogStream,
  createSupervisorLog,
  openSupervisorLogAppendStream,
  rotateSupervisorLog,
  tailSupervisorLog,
} from '../supervisorLog.js'

const dirs: string[] = []

function tmpScope(): string {
  const dir = mkdtempSync(join(tmpdir(), 'supervisor-log-test-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('SUPERVISOR_LOG_ROTATION_THRESHOLD_BYTES', () => {
  test('es el umbral de la referencia (`at` = 10 MiB)', () => {
    expect(SUPERVISOR_LOG_ROTATION_THRESHOLD_BYTES).toBe(10_485_760)
  })
})

describe('openSupervisorLogAppendStream / closeSupervisorLogStream', () => {
  test('abre en modo append y silencia los errores del stream', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    writeFileSync(path, 'linea previa\n')
    const stream = openSupervisorLogAppendStream(path)
    stream.write('linea nueva\n')
    // Un 'error' emitido a mano no debe propagarse: sin listener silencioso
    // esto tiraría el proceso de pruebas abajo.
    stream.emit('error', new Error('boom'))
    await closeSupervisorLogStream(stream)
    expect(readFileSync(path, 'utf8')).toBe('linea previa\nlinea nueva\n')
  })

  test('close resuelve enseguida si el stream ya está cerrado', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    const stream = openSupervisorLogAppendStream(path)
    await closeSupervisorLogStream(stream)
    // Segunda llamada: `stream.closed` ya es true, así que resuelve sin
    // esperar un segundo evento 'close' que no volverá a emitirse.
    await closeSupervisorLogStream(stream)
    expect(stream.closed).toBe(true)
  })
})

describe('rotateSupervisorLog', () => {
  test('renombra <path> a <path>.1', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    writeFileSync(path, 'contenido')
    await rotateSupervisorLog(path)
    expect(existsSync(path)).toBe(false)
    expect(readFileSync(`${path}.1`, 'utf8')).toBe('contenido')
  })

  test('si el archivo no existe (ENOENT), resuelve sin crear .1 y sin tocar el .1 anterior', async () => {
    const dir = tmpScope()
    const path = join(dir, 'no-existe.log')
    await rotateSupervisorLog(path)
    expect(existsSync(`${path}.1`)).toBe(false)
  })

  test('ENOENT corta antes del intento de borrar/reintentar — no llama a unlinkFn', async () => {
    const dir = tmpScope()
    const path = join(dir, 'no-existe.log')
    let unlinkCalls = 0
    await rotateSupervisorLog(path, {
      renameFn: async () => {
        const error = new Error('ENOENT') as NodeJS.ErrnoException
        error.code = 'ENOENT'
        throw error
      },
      unlinkFn: async () => { unlinkCalls += 1 },
    })
    expect(unlinkCalls).toBe(0)
  })

  test('si el primer renombrado falla por otra causa, borra el .1 viejo y reintenta', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    writeFileSync(path, 'contenido nuevo')
    writeFileSync(`${path}.1`, 'contenido viejo')
    let unlinkCalls = 0
    let renameCalls = 0
    await rotateSupervisorLog(path, {
      renameFn: async (oldPath, newPath) => {
        renameCalls += 1
        if (renameCalls === 1) {
          const error = new Error('EBUSY') as NodeJS.ErrnoException
          error.code = 'EBUSY'
          throw error
        }
        writeFileSync(newPath, readFileSync(oldPath, 'utf8'))
        rmSync(oldPath)
      },
      unlinkFn: async target => {
        unlinkCalls += 1
        rmSync(target)
      },
    })
    expect(unlinkCalls).toBe(1)
    expect(renameCalls).toBe(2)
    expect(readFileSync(`${path}.1`, 'utf8')).toBe('contenido nuevo')
  })

  test('si el reintento también falla, borra el original', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    writeFileSync(path, 'contenido')
    let renameCalls = 0
    let originalUnlinked = false
    await rotateSupervisorLog(path, {
      renameFn: async () => {
        renameCalls += 1
        const error = new Error('EBUSY') as NodeJS.ErrnoException
        error.code = 'EBUSY'
        throw error
      },
      unlinkFn: async target => {
        if (target === path) originalUnlinked = true
      },
    })
    expect(renameCalls).toBe(2)
    expect(originalUnlinked).toBe(true)
  })
})

describe('createSupervisorLog', () => {
  test('escribe una línea con timestamp y etiqueta', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    const writer = await createSupervisorLog(path)
    writer.write('supervisor', '─── daemon start ───')
    await writer.close()
    const content = readFileSync(path, 'utf8')
    expect(content).toMatch(/^\[[^\]]+] \[supervisor] ─── daemon start ───\n$/)
  })

  test('ecoa a stdout sólo cuando isTty es true', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    const echoed: string[] = []
    const writer = await createSupervisorLog(path, { isTty: true, echo: chunk => { echoed.push(chunk) } })
    writer.write('supervisor', 'hola')
    await writer.close()
    expect(echoed.length).toBe(1)

    const path2 = join(dir, 'daemon2.log')
    const echoed2: string[] = []
    const writer2 = await createSupervisorLog(path2, { isTty: false, echo: chunk => { echoed2.push(chunk) } })
    writer2.write('supervisor', 'hola')
    await writer2.close()
    expect(echoed2.length).toBe(0)
  })

  test('rota al superar el umbral y sigue escribiendo en el archivo nuevo', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    const writer = await createSupervisorLog(path, { thresholdBytes: 10 })
    writer.write('supervisor', 'linea-larga-que-supera-el-umbral')
    writer.write('supervisor', 'segunda')
    await writer.close()
    expect(existsSync(`${path}.1`)).toBe(true)
    const rotated = readFileSync(`${path}.1`, 'utf8')
    const current = readFileSync(path, 'utf8')
    expect(rotated).toContain('linea-larga-que-supera-el-umbral')
    expect(current).toContain('segunda')
  })

  test('rota al arrancar si el archivo ya supera el umbral', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    writeFileSync(path, 'x'.repeat(2000))
    const writer = await createSupervisorLog(path, { thresholdBytes: 1000 })
    writer.write('supervisor', 'nueva')
    await writer.close()
    expect(existsSync(`${path}.1`)).toBe(true)
    expect(readFileSync(`${path}.1`, 'utf8')).toBe('x'.repeat(2000))
    expect(readFileSync(path, 'utf8')).toContain('nueva')
  })

  test('close espera a que una rotación en curso termine antes de cerrar', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    const writer = await createSupervisorLog(path, { thresholdBytes: 5 })
    writer.write('supervisor', 'linea-que-dispara-rotacion')
    await writer.close()
    // Si close() no esperase la rotación, el archivo rotado podría faltar
    // o el stream cerrarse a mitad de la reapertura.
    expect(existsSync(`${path}.1`)).toBe(true)
  })

  test('tras close(), escribir no lanza y no toca el disco', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    const writer = await createSupervisorLog(path)
    await writer.close()
    const before = readFileSync(path, 'utf8')
    expect(() => writer.write('supervisor', 'tarde')).not.toThrow()
    expect(readFileSync(path, 'utf8')).toBe(before)
  })

  test('tras close(), escribir por encima del umbral no dispara una rotación sobre el stream ya cerrado', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.log')
    const writer = await createSupervisorLog(path, { thresholdBytes: 50 })
    writer.write('supervisor', 'short')
    await writer.close()
    // Sin la guarda `closed`, esta escritura post-close superaría el
    // umbral y dispararía una rotación de fondo sobre el stream ya
    // terminado: renombraría el `daemon.log` real a `.1` sin que nadie
    // vuelva a cerrarlo.
    writer.write('supervisor', 'x'.repeat(200))
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(existsSync(`${path}.1`)).toBe(false)
    expect(readFileSync(path, 'utf8')).toContain('short')
  })
})

describe('tailSupervisorLog', () => {
  test('propaga el código de salida del subproceso', async () => {
    const originalExitCode = process.exitCode
    process.exitCode = 0
    const listeners: Record<string, (arg: unknown) => void> = {}
    const fake = {
      on: (event: string, listener: (arg: unknown) => void) => {
        listeners[event] = listener
        return fake
      },
    }
    const promise = tailSupervisorLog('daemon.log', { spawnFn: () => fake as never })
    listeners.exit?.(2)
    await promise
    expect(process.exitCode).toBe(2)
    // Bun ignora la asignación de `undefined`: sin el `?? 0` el proceso de pruebas sale con el código fijado arriba.
    process.exitCode = originalExitCode ?? 0
  })

  test('no toca process.exitCode si el subproceso sale con código 0', async () => {
    const originalExitCode = process.exitCode
    process.exitCode = 0
    const listeners: Record<string, (arg: unknown) => void> = {}
    const fake = {
      on: (event: string, listener: (arg: unknown) => void) => {
        listeners[event] = listener
        return fake
      },
    }
    const promise = tailSupervisorLog('daemon.log', { spawnFn: () => fake as never })
    listeners.exit?.(0)
    await promise
    expect(process.exitCode).toBe(0)
    // Bun ignora la asignación de `undefined`: sin el `?? 0` el proceso de pruebas sale con el código fijado arriba.
    process.exitCode = originalExitCode ?? 0
  })

  test('un fallo de spawn se reporta y termina el proceso, sin matar las pruebas', async () => {
    const listeners: Record<string, (arg: unknown) => void> = {}
    const fake = {
      on: (event: string, listener: (arg: unknown) => void) => {
        listeners[event] = listener
        return fake
      },
    }
    const errors: string[] = []
    const exitCodes: number[] = []
    const promise = tailSupervisorLog('daemon.log', {
      spawnFn: () => fake as never,
      logErrorFn: message => { errors.push(message) },
      exitFn: code => { exitCodes.push(code) },
    })
    listeners.error?.(new Error('ENOENT'))
    await promise
    expect(errors).toEqual(['tail failed: ENOENT'])
    expect(exitCodes).toEqual([1])
  })
})

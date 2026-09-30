// Un directorio de datos del MITM en un temporal, declarado por THYROX_MITM_DATA_DIR, y su
// restauración; lo usan las pruebas del gestor que escriben el PID, los JSON o el store.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function useTempMitmDataDir(cleanups: Array<() => void>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-mitm-manager-'))
  const previous = process.env.THYROX_MITM_DATA_DIR
  process.env.THYROX_MITM_DATA_DIR = dir
  cleanups.push(() => {
    if (previous === undefined) delete process.env.THYROX_MITM_DATA_DIR
    else process.env.THYROX_MITM_DATA_DIR = previous
    fs.rmSync(dir, { recursive: true, force: true })
  })
  return dir
}

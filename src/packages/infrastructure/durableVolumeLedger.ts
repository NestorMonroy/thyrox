/**
 * El libro de volúmenes durables (H-THYROX-464): qué volumen durable creó o
 * adoptó la primitiva y desde cuándo. Vive en un archivo del hogar de datos
 * (nivel A, escritura atómica, 0600), fuera del almacenamiento de Podman, para
 * sobrevivir a la pérdida de ese almacenamiento: así un volumen durable que
 * falta se reconoce como pérdida y no como primera vez.
 *
 * Un registro ilegible se rehúsa: leerlo como vacío volvería a ocultar la
 * pérdida que existe para detectar.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { resolveDataDir } from '@thyrox/config/env/configHome.js'
import type { DurableVolumeLedger } from '@thyrox/podman-execution/resourceMaterialization.ts'

export const DURABLE_VOLUMES_DIR_ENV = 'THYROX_DURABLE_VOLUMES_DIR'
const DURABLE_VOLUMES_SUBDIR = 'durable-volumes'
const LEDGER_FILE = 'ledger.json'

type LedgerDocument = { volumes: Record<string, { createdAt: string }> }

export function durableVolumeLedgerPath(env: Record<string, string | undefined> = process.env): string {
  return join(resolveDataDir(DURABLE_VOLUMES_DIR_ENV, DURABLE_VOLUMES_SUBDIR, env), LEDGER_FILE)
}

export function fileDurableVolumeLedger(path: string): DurableVolumeLedger {
  return {
    async createdAt(volume) {
      return (await readLedger(path)).volumes[volume]?.createdAt
    },
    async record(volume, at) {
      const ledger = await readLedger(path)
      if (ledger.volumes[volume]) return
      ledger.volumes[volume] = { createdAt: at }
      await writeLedger(path, ledger)
    },
  }
}

async function readLedger(path: string): Promise<LedgerDocument> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { volumes: {} }
    throw error
  }
  try {
    const parsed = JSON.parse(text) as LedgerDocument
    if (typeof parsed?.volumes === 'object' && parsed.volumes !== null) return parsed
  } catch {
    // cae al rechazo de abajo
  }
  throw new Error(`durable volume ledger ${path} is unreadable: refusing to treat it as empty`)
}

async function writeLedger(path: string, ledger: LedgerDocument): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, path)
}

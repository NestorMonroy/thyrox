/**
 * Persistencia del archivo de cualificaciones (nivel A de ADR-006: archivo con
 * reemplazo atómico). Un archivo ausente es una lista vacía; uno ilegible o
 * inválido es un error con la ruta, nunca una lista vacía en silencio, y
 * añadir sobre él no lo pisa.
 */

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { parseQualifications, serializeQualifications, type ModelQualification } from '@thyrox/model-artifacts/modelQualification.ts'

const FILE_NOT_FOUND_CODE = 'ENOENT'

export class QualificationFileError extends Error {
  constructor(readonly path: string, reason: string) {
    super(`cualificaciones ilegibles (${path}): ${reason}`)
    this.name = 'QualificationFileError'
  }
}

export async function loadQualifications(path: string): Promise<ModelQualification[]> {
  const text = await readTextIfPresent(path)
  if (text === undefined) return []
  try {
    return parseQualifications(text)
  } catch (error) {
    throw new QualificationFileError(path, (error as Error).message)
  }
}

/** Añade una medición a las existentes y reescribe el archivo de forma atómica. */
export async function appendQualification(path: string, qualification: ModelQualification): Promise<void> {
  const existing = await loadQualifications(path)
  await mkdir(dirname(path), { recursive: true })
  await writeAtomically(path, serializeQualifications([...existing, qualification]))
}

async function readTextIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === FILE_NOT_FOUND_CODE) return undefined
    throw new QualificationFileError(path, (error as Error).message)
  }
}

async function writeAtomically(path: string, text: string): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(temporaryPath, text, { flag: 'wx' })
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

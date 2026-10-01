/**
 * Los nombres del archivo de instrucciones y de sus directorios. El
 * ejecutable 2.1.283 los fija como `CLAUDE.md`, `CLAUDE.local.md`, (thyrox-rename: keep — respaldo heredado)
 * `.claude/CLAUDE.md` y `.claude/rules`; thyrox usa sus nombres propios (thyrox-rename: keep — respaldo heredado)
 * y conserva los heredados como respaldo de lectura.
 *
 * Cada ranura es una lista de candidatos en orden de preferencia: se carga el
 * primero que exista, nunca los dos, para que un proyecto que ya migró no
 * reciba sus instrucciones duplicadas. Los directorios de reglas no son una
 * ranura: sus archivos son distintos entre sí y se cargan los de ambos.
 */
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { CONFIG_DIR_NAME, CONFIG_DIR_NAMES, LEGACY_CONFIG_DIR_NAME } from './configHome.js'

export const INSTRUCTIONS_FILE_NAME = 'THYROX.md'
export const LEGACY_INSTRUCTIONS_FILE_NAME = 'CLAUDE.md'
export const LOCAL_INSTRUCTIONS_FILE_NAME = 'THYROX.local.md'
export const LEGACY_LOCAL_INSTRUCTIONS_FILE_NAME = 'CLAUDE.local.md'

export const INSTRUCTIONS_FILE_NAMES = [INSTRUCTIONS_FILE_NAME, LEGACY_INSTRUCTIONS_FILE_NAME] as const
export const LOCAL_INSTRUCTIONS_FILE_NAMES = [
  LOCAL_INSTRUCTIONS_FILE_NAME,
  LEGACY_LOCAL_INSTRUCTIONS_FILE_NAME,
] as const

/** `<dir>/THYROX.md`, luego `<dir>/THYROX.md`. */
export function instructionsFileCandidates(dir: string): string[] {
  return INSTRUCTIONS_FILE_NAMES.map(name => join(dir, name))
}

/** `<dir>/THYROX.local.md`, luego `<dir>/THYROX.local.md`. */
export function localInstructionsFileCandidates(dir: string): string[] {
  return LOCAL_INSTRUCTIONS_FILE_NAMES.map(name => join(dir, name))
}

/** `<dir>/.thyrox/THYROX.md`, luego `<dir>/.claude/THYROX.md`: cada nombre
 * de directorio con su archivo, sin cruzarlos. */
export function nestedInstructionsFileCandidates(dir: string): string[] {
  return [
    join(dir, CONFIG_DIR_NAME, INSTRUCTIONS_FILE_NAME),
    join(dir, LEGACY_CONFIG_DIR_NAME, LEGACY_INSTRUCTIONS_FILE_NAME),
  ]
}

/** `<dir>/.thyrox/rules` y `<dir>/.claude/rules`. */
export function rulesDirectories(dir: string): string[] {
  return CONFIG_DIR_NAMES.map(name => join(dir, name, 'rules'))
}

/** ¿Es un archivo de instrucciones por su nombre, propio o heredado? */
export function isInstructionsFileName(name: string): boolean {
  return (
    (INSTRUCTIONS_FILE_NAMES as readonly string[]).includes(name) ||
    (LOCAL_INSTRUCTIONS_FILE_NAMES as readonly string[]).includes(name)
  )
}

/**
 * La ruta de una ranura: el primer candidato que existe, o el primero de la
 * lista si no existe ninguno. Sirve para leer (el archivo que hay) y para
 * escribir (el que hay, o uno nuevo con el nombre propio).
 */
export function pickInstructionsFile(
  candidates: readonly string[],
  exists: (path: string) => boolean = existsSync,
): string {
  return candidates.find(exists) ?? candidates[0]!
}

/** ¿La ruta es el archivo de instrucciones de un proyecto (`THYROX.md` o el
 * heredado `THYROX.md`)? El local no cuenta: es personal, no del proyecto. */
export function isProjectInstructionsFile(path: string): boolean {
  return (INSTRUCTIONS_FILE_NAMES as readonly string[]).includes(basename(path))
}

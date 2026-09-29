#!/usr/bin/env bun
/**
 * Genera `THYROX_STORAGE_ENCRYPTION_KEY` — el secreto que
 * `accounts/fieldCipher.ts` deriva con scrypt para cifrar las credenciales
 * guardadas. `fieldCipher.ts` acepta cualquier cadena no vacía como secreto
 * (`declared = secret?.trim() ? secret : undefined`); este generador produce
 * 32 bytes aleatorios en hexadecimal, con la misma entropía que
 * `KEY_LENGTH` deriva para la clave AES-256 real.
 *
 *   bun bin/generateStorageKey.ts [--env-file <ruta>]
 *
 * Sin `--env-file`, el `.env` de la raíz de thyrox (`@thyrox/paths/reach.ts:
 * thyroxRoot`). Si la variable YA está declarada con un valor no vacío en ese
 * archivo, rehúsa y deja el archivo intacto: rotarla dejaría huérfanas las
 * conexiones que esa clave ya cifró. La clave nunca se imprime, ni por stdout
 * ni por stderr.
 *
 *   bun bin/generateStorageKey.ts --rotate [--env-file <ruta>]
 *
 * `--rotate` reemplaza una clave ya declarada: recifra con la nueva las
 * credenciales del store de conexiones (`rotateStorageKey`, en una sola
 * transacción) y sólo entonces publica el `.env` nuevo, escrito antes a un
 * archivo hermano y movido encima. Si el store rehúsa, el `.env` no cambia;
 * si el `.env` no se puede publicar, el store vuelve a la clave anterior.
 *
 * Salidas: 0 escrita o rotada · 1 la variable ya está declarada (sin
 * `--rotate`), no hay clave que rotar, o el store rehusó · 2 invocación
 * inválida (falta el valor de `--env-file`, o no se pudo derivar la raíz de
 * thyrox para el valor por defecto), o el `.env` rotado no se pudo publicar.
 */
import { randomBytes } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { existsSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { thyroxRoot } from '@thyrox/paths/reach.ts'

import { CONNECTIONS_DB_FILE, resolveProvidersDataDir } from '../src/accounts/connectionStoreHome.ts'
import { STORAGE_KEY_VARIABLE } from '../src/accounts/fieldCipher.ts'
import { rotateStorageKey, type RotationOutcome } from '../src/accounts/storageKeyRotation.ts'

const KEY_BYTES = 32

/** 32 bytes aleatorios en hex: el mismo tamaño que `KEY_LENGTH` deriva para AES-256. */
function generateKey(): string {
  return randomBytes(KEY_BYTES).toString('hex')
}

function defaultEnvFilePath(): string {
  return join(thyroxRoot(), '.env')
}

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}

/**
 * El valor ya declarado de la variable en `path`, o `null` si no hay
 * archivo, no hay línea para ella, o su valor está en blanco — un valor en
 * blanco no cifró nada todavía, así que completarlo no rota ninguna clave en
 * uso.
 */
function declaredValue(path: string, name: string): string | null {
  if (!existsSync(path)) return null
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (declaredName(line) !== name) continue
    const value = line.slice(line.indexOf('=') + 1).trim()
    if (value) return value
  }
  return null
}

/** El nombre que declara `line`, sin `export ` ni espacios, o `null` si no declara nada. */
function declaredName(line: string): string | null {
  let body = line.trim()
  if (!body || body.startsWith('#')) return null
  if (body.startsWith('export ')) body = body.slice('export '.length).trimStart()
  const cut = body.indexOf('=')
  return cut === -1 ? null : body.slice(0, cut).trim()
}

/**
 * Escribe la clave: completa en su sitio una declaración en blanco, o añade
 * la línea al final si la variable no está declarada. `declaredValue` ya
 * descartó el caso de un valor no vacío.
 */
function writeKey(path: string, key: string): void {
  const declaration = `${STORAGE_KEY_VARIABLE}=${key}`
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const lines = existing.split('\n')
  const blank = lines.findIndex(line => declaredName(line) === STORAGE_KEY_VARIABLE)
  if (blank !== -1) {
    lines[blank] = declaration
    writeFileSync(path, lines.join('\n'))
    return
  }
  const withNewline = existing.length > 0 && !existing.endsWith('\n') ? `${existing}\n` : existing
  writeFileSync(path, `${withNewline}${declaration}\n`)
}

/** El contenido de `existing` con la declaración de la variable apuntando a `key`. */
function withKeyReplaced(existing: string, key: string): string {
  return existing
    .split('\n')
    .map(line => (declaredName(line) === STORAGE_KEY_VARIABLE ? `${STORAGE_KEY_VARIABLE}=${key}` : line))
    .join('\n')
}

function describeRefusal(outcome: Exclude<RotationOutcome, { kind: 'rotated' }>): string {
  if (outcome.reason === 'undecryptable') {
    return `la conexión ${outcome.connectionId} guarda en ${outcome.column} un valor que la clave declarada no descifra`
  }
  if (outcome.reason === 'verification') {
    return `la clave nueva no devolvió el valor de ${outcome.connectionId}.${outcome.column}; la transacción se deshizo`
  }
  return outcome.reason === 'same-key' ? 'la clave nueva coincide con la anterior' : 'falta una de las dos claves'
}

export interface GenerateStorageKeyDeps {
  /** Publica el `.env` rotado; se inyecta para probar el camino en que falla. */
  rename?: (from: string, to: string) => void
}

function rotate(envFile: string, deps: GenerateStorageKeyDeps): number {
  const previous = declaredValue(envFile, STORAGE_KEY_VARIABLE)
  if (previous === null) {
    process.stderr.write(`${STORAGE_KEY_VARIABLE} no está declarada en ${envFile}: no hay clave que rotar.\n`)
    return 1
  }
  const next = generateKey()
  const staged = `${envFile}.rotating`
  writeFileSync(staged, withKeyReplaced(readFileSync(envFile, 'utf8'), next), { mode: statSync(envFile).mode })

  const storePath = join(resolveProvidersDataDir(process.env), CONNECTIONS_DB_FILE)
  const db = existsSync(storePath) ? new Database(storePath) : null
  try {
    const outcome: RotationOutcome = db ? rotateStorageKey(db, previous, next) : { kind: 'rotated', fields: 0 }
    if (outcome.kind === 'refused') {
      rmSync(staged, { force: true })
      process.stderr.write(`No se rota ${STORAGE_KEY_VARIABLE}: ${describeRefusal(outcome)}. ${envFile} y el store quedan intactos.\n`)
      return 1
    }
    try {
      ;(deps.rename ?? renameSync)(staged, envFile)
    } catch (error) {
      const restored = db ? rotateStorageKey(db, next, previous) : ({ kind: 'rotated', fields: 0 } as const)
      if (restored.kind === 'rotated') {
        rmSync(staged, { force: true })
        process.stderr.write(`No se pudo publicar ${envFile} (${(error as Error).message}); el store volvió a la clave anterior.\n`)
      } else {
        process.stderr.write(
          `No se pudo publicar ${envFile} (${(error as Error).message}) ni devolver el store a la clave anterior: ` +
            `la clave vigente está en ${staged}, no lo borres.\n`,
        )
      }
      return 2
    }
    process.stdout.write(`${STORAGE_KEY_VARIABLE} rotada en ${envFile}: ${outcome.fields} credencial(es) recifrada(s)\n`)
    return 0
  } finally {
    db?.close()
  }
}

export function main(argv: string[], deps: GenerateStorageKeyDeps = {}): number {
  let envFile: string
  const declared = arg(argv, 'env-file')
  if (argv.includes('--env-file') && declared === undefined) {
    process.stderr.write('--env-file requiere una ruta.\n')
    return 2
  }
  try {
    envFile = declared ?? defaultEnvFilePath()
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`)
    return 2
  }

  if (argv.includes('--rotate')) return rotate(envFile, deps)

  if (declaredValue(envFile, STORAGE_KEY_VARIABLE) !== null) {
    process.stderr.write(
      `${STORAGE_KEY_VARIABLE} ya está declarada en ${envFile}: no se rota, ` +
        'dejaría huérfanas las conexiones que esa clave ya cifró.\n',
    )
    return 1
  }

  writeKey(envFile, generateKey())
  process.stdout.write(`${STORAGE_KEY_VARIABLE} escrita en ${envFile}\n`)
  return 0
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)))
}

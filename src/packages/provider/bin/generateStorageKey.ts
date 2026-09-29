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
 * Salidas: 0 escrita · 1 la variable ya está declarada · 2 invocación
 * inválida (falta el valor de `--env-file`, o no se pudo derivar la raíz de
 * thyrox para el valor por defecto).
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { thyroxRoot } from '@thyrox/paths/reach.ts'

import { STORAGE_KEY_VARIABLE } from '../src/accounts/fieldCipher.ts'

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

export function main(argv: string[]): number {
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

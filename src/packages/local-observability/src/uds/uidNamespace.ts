/**
 * El espacio de nombres de uid del proceso, leído de `/proc`. Porte de `F`,
 * `h`, `R`, `B`, `bko`, `L`, `LOt`, `A` y `m` de 2.1.283 (`chunk-wngxtykq.js`).
 *
 * Dentro de un espacio de nombres de usuario sin mapa, todo dueño ajeno se lee
 * como el uid de desbordamiento: la propiedad de un archivo deja de probar
 * nada, y el buzón lo tiene que saber antes de confiar en un directorio.
 */
import { readFile } from 'node:fs/promises'

/** El uid de desbordamiento del núcleo cuando `/proc` no lo declara. */
export const OVERFLOW_UID_DEFAULT = 65534

const FULL_RANGE = 4294967295

/** Directorios de sistema que un dueño ambiguo no invalida. */
export const TRUSTED_SYSTEM_DIRS: ReadonlySet<string> = new Set([
  '/', '/dev', '/dev/shm', '/run', '/run/user', '/tmp', '/var', '/var/tmp', '/var/run',
  '/home', '/var/home', '/root', '/var/roothome', '/mnt', '/mnt/wslg',
])

export type UidMapRange = { innerStart: number; hostStart: number; count: number }

export type UidNamespace = {
  /** El uid de desbordamiento cuando cae fuera del mapa: el dueño de todo lo no mapeado. */
  unmappedOwnerUid: number | undefined
  /** Si los uid colapsan en uno solo y la propiedad no se puede verificar. */
  uidCollapses: boolean
  /** Si el uid de desbordamiento es 0, y por tanto root no se distingue de un ajeno. */
  rootUidAmbiguous: boolean
}

export type UidNamespaceReaders = {
  readUidMap: () => Promise<string | undefined>
  readOverflowUid: () => Promise<string | undefined>
  getuid: () => number | undefined
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return undefined
  }
}

export const procUidNamespaceReaders: UidNamespaceReaders = {
  readUidMap: () => readOptional('/proc/self/uid_map'),
  readOverflowUid: () => readOptional('/proc/sys/kernel/overflowuid'),
  getuid: () => process.getuid?.(),
}

/** `F`: las filas de `uid_map`; una fila malformada invalida el mapa. */
export function parseUidMap(text: string): UidMapRange[] | undefined {
  const ranges: UidMapRange[] = []
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    const fields = line.trim().split(/\s+/)
    const [innerStart, hostStart, count] = fields.map(Number)
    const valid = fields.length === 3
      && Number.isSafeInteger(innerStart) && innerStart! >= 0
      && Number.isSafeInteger(hostStart) && hostStart! >= 0
      && Number.isSafeInteger(count) && count! > 0
    if (!valid) return undefined
    ranges.push({ innerStart: innerStart!, hostStart: hostStart!, count: count! })
  }
  return ranges
}

/** `h`: el mapa del espacio inicial, que no traduce nada. */
export function isIdentityUidMap(ranges: UidMapRange[]): boolean {
  return ranges.length === 1 && ranges[0]!.innerStart === 0 && ranges[0]!.count >= FULL_RANGE
}

/** `R`: el contenido de `overflowuid`, si es un entero. */
export function parseOverflowUid(text: string): number | undefined {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return undefined
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : undefined
}

function insideMap(ranges: UidMapRange[], uid: number): boolean {
  return ranges.some(range => uid >= range.innerStart && uid < range.innerStart + range.count)
}

async function readUidMap(readers: UidNamespaceReaders): Promise<UidMapRange[] | undefined> {
  const text = await readers.readUidMap()
  return text === undefined ? undefined : parseUidMap(text)
}

async function readOverflow(readers: UidNamespaceReaders): Promise<number | undefined> {
  const text = await readers.readOverflowUid()
  return text === undefined ? undefined : parseOverflowUid(text)
}

/**
 * `bko`: lo que el espacio de nombres del proceso impide verificar, o
 * `undefined` en el espacio inicial.
 */
export async function probeUidNamespace(readers: UidNamespaceReaders = procUidNamespaceReaders): Promise<UidNamespace | undefined> {
  const uid = readers.getuid()
  const ranges = await readUidMap(readers)
  const overflow = await readOverflow(readers)
  if (ranges === undefined) {
    const effective = overflow ?? OVERFLOW_UID_DEFAULT
    return uid === effective ? { unmappedOwnerUid: undefined, uidCollapses: true, rootUidAmbiguous: effective === 0 } : undefined
  }
  if (isIdentityUidMap(ranges)) return undefined
  const effective = overflow ?? OVERFLOW_UID_DEFAULT
  return {
    unmappedOwnerUid: ranges.length === 0 || overflow === undefined || insideMap(ranges, overflow) ? undefined : overflow,
    uidCollapses: ranges.length === 0 || (uid !== undefined && uid === effective),
    rootUidAmbiguous: overflow === 0,
  }
}

/**
 * `LOt`: el uid del anfitrión que corresponde a este proceso, para reconocer
 * como propios los directorios de pares creados desde fuera del espacio.
 */
export async function hostUidForPeerDirs(readers: UidNamespaceReaders = procUidNamespaceReaders): Promise<number | undefined> {
  const uid = readers.getuid()
  if (uid === undefined) return undefined
  const ranges = await readUidMap(readers)
  if (ranges === undefined) return undefined
  if (isIdentityUidMap(ranges)) return uid
  const overflow = (await readOverflow(readers)) ?? OVERFLOW_UID_DEFAULT
  if (ranges.length === 0 || uid === overflow) return undefined
  if (insideMap(ranges, overflow)) return uid
  const range = ranges.find(candidate => uid >= candidate.innerStart && uid < candidate.innerStart + candidate.count)
  return range === undefined ? undefined : range.hostStart + (uid - range.innerStart)
}

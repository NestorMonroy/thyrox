/**
 * La observación de Podman, propiedad de la primitiva (ADR-007, Regla 4, P3):
 * un consumidor que necesita saber qué contenedores, volúmenes e imágenes hay
 * lo PIDE a este módulo y nunca emite `podman inspect`/`ps`/`volume` por su
 * cuenta (P4, `check_podman_access_ownership`).
 *
 * Sólo lee. Corre en el plano de control —una ExecutionUnit no ve el almacén
 * de Podman, y montarle el socket la convertiría en plano de control—. Cada
 * función compone el argv y lo entrega al `PodmanExecutor` del paquete, así que
 * las suites corren con un doble.
 */
import type { PodmanCommandResult, PodmanExecutor } from './podmanExecutor.ts'

export class PodmanObservationError extends Error {
  constructor(readonly stage: string, result: PodmanCommandResult) {
    super(`${stage}: ${result.stderr.trim() || result.stdout.trim() || `exit ${result.exitCode}`}`)
  }
}

export type ObservedMount = { type: string; name: string | null; source: string; destination: string; readWrite: boolean }
export type ObservedContainer = {
  id: string; name: string; state: string; running: boolean; pid: number; imageId: string; image: string
  created: string; labels: Record<string, string>; mounts: ObservedMount[]; portBindings: Record<string, { hostIp: string; hostPort: string }[]>
}
export type ObservedVolume = { name: string; mountpoint: string; createdAt: string; labels: Record<string, string> }
export type ObservedImage = { id: string; tags: string[]; digests: string[]; bytes: number; created: string; labels: Record<string, string> }
export type ObservedStorage = { graphRoot: string; databaseBackend: string; version: string }
export type ImageUsage = { id: string; uniqueBytes: number; sharedBytes: number; containers: number }

type Json = Record<string, unknown>

async function read(podman: PodmanExecutor, stage: string, args: readonly string[]): Promise<string> {
  const result = await podman.run(args)
  if (result.exitCode !== 0) throw new PodmanObservationError(stage, result)
  return result.stdout
}

function parseList(stage: string, text: string): Json[] {
  const parsed: unknown = JSON.parse(text.trim() || '[]')
  if (!Array.isArray(parsed)) throw new Error(`${stage}: se esperaba una lista JSON`)
  return parsed as Json[]
}

const asRecord = (value: unknown): Record<string, string> => (value && typeof value === 'object' ? value as Record<string, string> : {})
const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

function containerOf(document: Json): ObservedContainer {
  const state = (document.State ?? {}) as Json
  const config = (document.Config ?? {}) as Json
  const host = (document.HostConfig ?? {}) as Json
  const bindings = (host.PortBindings ?? {}) as Record<string, { HostIp?: string; HostPort?: string }[] | null>
  return {
    id: asString(document.Id),
    name: asString(document.Name).replace(/^\//, ''),
    state: asString(state.Status),
    running: state.Running === true,
    pid: typeof state.Pid === 'number' ? state.Pid : 0,
    imageId: asString(document.Image),
    image: asString(document.ImageName) || asString(config.Image),
    created: asString(document.Created),
    labels: asRecord(config.Labels),
    mounts: ((document.Mounts ?? []) as Json[]).map(mount => ({
      type: asString(mount.Type), name: asString(mount.Name) || null, source: asString(mount.Source),
      destination: asString(mount.Destination), readWrite: mount.RW === true,
    })),
    portBindings: Object.fromEntries(Object.entries(bindings).map(([port, list]) =>
      [port, (list ?? []).map(binding => ({ hostIp: binding.HostIp ?? '', hostPort: binding.HostPort ?? '' }))])),
  }
}

/**
 * El documento de inspección completo de un contenedor, o `null` si no existe.
 * Lo pide una verificación que necesita TODOS los campos (que el valor de un
 * secreto no aparezca en ninguno); el resto usa la vista de `inspectContainer`.
 */
export async function inspectContainerDocument(podman: PodmanExecutor, name: string): Promise<Record<string, unknown> | null> {
  const result = await podman.run(['container', 'inspect', name])
  if (result.exitCode !== 0) {
    if (/no such (container|object)/i.test(result.stderr)) return null
    throw new PodmanObservationError('container inspect', result)
  }
  return parseList('container inspect', result.stdout)[0] ?? null
}

/** El contenedor con ese nombre o id, o `null` si no existe. */
export async function inspectContainer(podman: PodmanExecutor, name: string): Promise<ObservedContainer | null> {
  const document = await inspectContainerDocument(podman, name)
  return document ? containerOf(document) : null
}

/** El volumen con ese nombre, o `null` si no existe. */
export async function inspectVolume(podman: PodmanExecutor, name: string): Promise<ObservedVolume | null> {
  const result = await podman.run(['volume', 'inspect', name])
  if (result.exitCode !== 0) {
    if (/no such volume/i.test(result.stderr)) return null
    throw new PodmanObservationError('volume inspect', result)
  }
  const [document] = parseList('volume inspect', result.stdout)
  return document ? { name: asString(document.Name), mountpoint: asString(document.Mountpoint),
    createdAt: asString(document.CreatedAt), labels: asRecord(document.Labels) } : null
}

/** Las etiquetas de un secreto —nunca su valor—, o `null` si no existe. */
export async function secretLabels(podman: PodmanExecutor, name: string): Promise<Record<string, string> | null> {
  const result = await podman.run(['secret', 'inspect', name])
  if (result.exitCode !== 0) {
    if (/no such secret/i.test(result.stderr)) return null
    throw new PodmanObservationError('secret inspect', result)
  }
  const [document] = parseList('secret inspect', result.stdout)
  return asRecord(((document?.Spec ?? {}) as Json).Labels)
}

/** Todos los contenedores, vivos y detenidos, inspeccionados. */
export async function listContainers(podman: PodmanExecutor): Promise<ObservedContainer[]> {
  const ids = (await read(podman, 'ps', ['ps', '--all', '--format', '{{.ID}}'])).split('\n').filter(Boolean)
  if (ids.length === 0) return []
  return parseList('container inspect', await read(podman, 'container inspect', ['container', 'inspect', ...ids])).map(containerOf)
}

/** Todos los volúmenes, inspeccionados. */
export async function listVolumes(podman: PodmanExecutor): Promise<ObservedVolume[]> {
  const names = (await read(podman, 'volume ls', ['volume', 'ls', '--format', '{{.Name}}'])).split('\n').filter(Boolean)
  if (names.length === 0) return []
  return parseList('volume inspect', await read(podman, 'volume inspect', ['volume', 'inspect', ...names]))
    .map(document => ({ name: asString(document.Name), mountpoint: asString(document.Mountpoint),
      createdAt: asString(document.CreatedAt), labels: asRecord(document.Labels) }))
}

/** Todas las imágenes, incluidas las intermedias, inspeccionadas. */
export async function listAllImages(podman: PodmanExecutor): Promise<ObservedImage[]> {
  const ids = [...new Set((await read(podman, 'images', ['images', '--all', '--no-trunc', '--format', '{{.ID}}'])).split('\n').filter(Boolean))]
  if (ids.length === 0) return []
  return parseList('image inspect', await read(podman, 'image inspect', ['image', 'inspect', ...ids])).map(document => ({
    id: asString(document.Id), tags: (document.RepoTags ?? []) as string[], digests: (document.RepoDigests ?? []) as string[],
    bytes: typeof document.Size === 'number' ? document.Size : 0, created: asString(document.Created),
    labels: asRecord(((document.Config ?? {}) as Json).Labels ?? document.Labels),
  }))
}

/** Dónde vive el almacén y con qué motor. */
export async function storageInfo(podman: PodmanExecutor): Promise<ObservedStorage> {
  const info = JSON.parse(await read(podman, 'info', ['info', '--format', 'json'])) as Json
  const store = (info.store ?? info.Store ?? {}) as Json
  const host = (info.host ?? info.Host ?? {}) as Json
  const version = (info.version ?? info.Version ?? {}) as Json
  return { graphRoot: asString(store.graphRoot ?? store.GraphRoot), databaseBackend: asString(host.databaseBackend ?? host.DatabaseBackend),
    version: asString(version.Version ?? version.version) }
}

const SIZE_UNITS: Record<string, number> = { B: 1, kB: 1e3, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 }

/** Un tamaño de la tabla de Podman («2.958GB», «161B»): decimal y con el redondeo de Podman. */
export function parseHumanSize(text: string): number {
  const match = /^([0-9.]+)\s*([kKMGT]?B)$/.exec(text.trim())
  if (!match) throw new Error(`tamaño ilegible en system df: «${text}»`)
  return Math.round(Number(match[1]) * (SIZE_UNITS[match[2] as string] ?? 1))
}

/**
 * El tamaño propio y compartido de cada imagen, según la contabilidad de
 * Podman. Sólo la tabla de `system df --verbose` lo da (Podman 4.9 no combina
 * `--verbose` con `--format json`), así que los bytes llevan su redondeo:
 * unas tres cifras significativas.
 */
export async function imageUsage(podman: PodmanExecutor): Promise<ImageUsage[]> {
  const text = await read(podman, 'system df', ['system', 'df', '--verbose'])
  const lines = text.split('\n')
  const start = lines.findIndex(line => line.startsWith('REPOSITORY'))
  const usage: ImageUsage[] = []
  for (const line of start < 0 ? [] : lines.slice(start + 1)) {
    if (line.trim() === '') break
    const columns = line.trim().split(/\s{2,}/)
    if (columns.length < 8) continue
    usage.push({ id: columns[2] as string, sharedBytes: parseHumanSize(columns[5] as string),
      uniqueBytes: parseHumanSize(columns[6] as string), containers: Number(columns[7]) })
  }
  return usage
}

export type PodmanSnapshot = {
  storage: ObservedStorage
  containers: ObservedContainer[]
  volumes: (ObservedVolume & { usedBy: string[] })[]
  images: (ObservedImage & { usedBy: string[]; uniqueBytes: number | null })[]
}

/** Todo el estado observable, con las referencias derivadas: qué contenedor usa cada volumen e imagen. */
export async function snapshot(podman: PodmanExecutor): Promise<PodmanSnapshot> {
  const [storage, containers, volumes, images, usage] = [await storageInfo(podman), await listContainers(podman),
    await listVolumes(podman), await listAllImages(podman), await imageUsage(podman)]
  const unique = new Map(usage.map(entry => [entry.id.replace(/^sha256:/, ''), entry.uniqueBytes]))
  const idOf = (id: string) => id.replace(/^sha256:/, '')
  const uniqueFor = (id: string) => unique.get(idOf(id)) ?? [...unique].find(([key]) => idOf(id).startsWith(key))?.[1] ?? null
  return {
    storage,
    containers,
    volumes: volumes.map(volume => ({ ...volume, usedBy: containers.filter(c => c.mounts.some(m => m.name === volume.name)).map(c => c.name) })),
    images: images.map(image => ({ ...image, usedBy: containers.filter(c => idOf(c.imageId) === idOf(image.id)).map(c => c.name),
      uniqueBytes: uniqueFor(image.id) })),
  }
}

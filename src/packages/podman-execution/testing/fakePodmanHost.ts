/**
 * Doble con estado de un anfitrión Podman para las suites de materialización
 * declarativa. Modela lo que `resourceMaterialization.ts` le pide: contenedores
 * (con su estado, PID, etiquetas, imagen, montajes, entorno y secretos), volúmenes
 * con nombre, secretos de Podman, redes y la salud que responde `exec`.
 *
 * Registra cada argv y cada stdin, para que una suite pueda afirmar que un valor
 * secreto nunca viajó en argv y que ningún volumen se retiró. El `inspect` de
 * contenedor devuelve el JSON con la forma de Podman 4.9.3 (`State`, `Config`,
 * `ImageName`, `Mounts`); que esa forma sea la real lo prueba la suite contra el
 * Podman de verdad.
 */

import type { PodmanCommandResult, PodmanExecutor, PodmanRunOptions } from '../podmanExecutor.js'

export type FakeMount =
  | { Type: 'volume'; Name: string; Destination: string }
  | { Type: 'bind'; Source: string; Destination: string }

export type FakeContainer = {
  status: string
  pid: number
  labels: Record<string, string>
  image: string
  mounts: FakeMount[]
  env: string[]
  secrets: { name: string; target: string }[]
}

export type FakeSecret = { labels: Record<string, string>; value: string }

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }
const NOT_FOUND_EXIT = 125
const FIRST_PID = 1000

function fail(stderr: string, exitCode = NOT_FOUND_EXIT): PodmanCommandResult {
  return { exitCode, stdout: '', stderr }
}

function splitKeyValue(text: string): [string, string] {
  const at = text.indexOf('=')
  return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at + 1)]
}

function parseMount(spec: string): FakeMount {
  const fields = Object.fromEntries(spec.split(',').map(splitKeyValue))
  if (fields.type === 'volume') return { Type: 'volume', Name: fields.source ?? '', Destination: fields.destination ?? '' }
  return { Type: 'bind', Source: fields.source ?? '', Destination: fields.destination ?? '' }
}

function parseSecret(spec: string): { name: string; target: string } {
  const [name, ...rest] = spec.split(',')
  const fields = Object.fromEntries(rest.map(splitKeyValue))
  return { name: name ?? '', target: fields.target ?? name ?? '' }
}

/** Opciones de `podman create` que llevan un valor a continuación. */
const CREATE_VALUE_FLAGS = new Set(['--name', '--label', '--mount', '--secret', '-e', '--network', '-p', '--restart'])

export class FakePodmanHost implements PodmanExecutor {
  readonly containers = new Map<string, FakeContainer>()
  readonly volumes = new Set<string>()
  /** Etiquetas con que `volume create` creó cada volumen. */
  readonly volumeLabels = new Map<string, Record<string, string>>()
  readonly secrets = new Map<string, FakeSecret>()
  readonly networks = new Set<string>()
  readonly calls: string[][] = []
  readonly stdins: string[] = []
  /** Procesos vivos; `start` añade el PID nuevo, la suite puede matarlo. */
  readonly alivePids = new Set<number>()
  /** Contenedores cuyo `exec` de salud responde 0. */
  readonly healthyContainers = new Set<string>()
  /** Si se fija, el siguiente `create` falla con este resultado. */
  failNextCreate: PodmanCommandResult | null = null
  /** Resultados con que fallan los siguientes `start`, en orden. */
  readonly failNextStarts: PodmanCommandResult[] = []
  private nextPid = FIRST_PID

  isProcessAlive = (pid: number): boolean => this.alivePids.has(pid)

  async run(args: readonly string[], options: PodmanRunOptions = {}): Promise<PodmanCommandResult> {
    this.calls.push([...args])
    if (options.stdin !== undefined) this.stdins.push(options.stdin)
    const [command, sub] = args
    if (command === 'container' && sub === 'inspect') return this.inspectContainer(args[2] ?? '')
    if (command === 'create') return this.create(args.slice(1))
    if (command === 'start') return this.start(args[1] ?? '')
    if (command === 'rm') return this.remove(args[args.length - 1] ?? '')
    if (command === 'exec') return this.healthyContainers.has(args[1] ?? '') ? OK : fail('unhealthy', 1)
    if (command === 'volume') return this.volume(sub ?? '', args.slice(2))
    if (command === 'network') return this.network(sub ?? '', args[2] ?? '')
    if (command === 'secret') return this.secret(args.slice(1), options.stdin)
    return fail(`fake: comando no modelado: ${args.join(' ')}`, 1)
  }

  /** Siembra un contenedor existente, p. ej. uno creado por otro dueño o por el camino anterior. */
  seedContainer(name: string, container: FakeContainer): void {
    this.containers.set(name, container)
    if (container.status === 'running' && container.pid > 0) this.alivePids.add(container.pid)
  }

  /** Mata el proceso de un contenedor sin que Podman se entere: el estado stale medido. */
  killProcessOf(name: string): void {
    const container = this.containers.get(name)
    if (container) this.alivePids.delete(container.pid)
  }

  private inspectContainer(name: string): PodmanCommandResult {
    const container = this.containers.get(name)
    if (!container) return fail(`Error: no such container ${name}`)
    const document = [{
      Name: name,
      State: { Status: container.status, Pid: container.pid },
      Config: { Labels: container.labels, Image: container.image, Env: container.env },
      ImageName: container.image,
      Mounts: container.mounts,
    }]
    return { exitCode: 0, stdout: JSON.stringify(document), stderr: '' }
  }

  private create(args: readonly string[]): PodmanCommandResult {
    if (this.failNextCreate) {
      const result = this.failNextCreate
      this.failNextCreate = null
      return result
    }
    const container: FakeContainer = { status: 'created', pid: 0, labels: {}, image: '', mounts: [], env: [], secrets: [] }
    let name = ''
    let index = 0
    while (index < args.length) {
      const flag = args[index] as string
      if (CREATE_VALUE_FLAGS.has(flag)) {
        const value = args[index + 1] ?? ''
        if (flag === '--name') name = value
        if (flag === '--label') { const [k, v] = splitKeyValue(value); container.labels[k] = v }
        if (flag === '--mount') container.mounts.push(parseMount(value))
        if (flag === '--secret') container.secrets.push(parseSecret(value))
        if (flag === '-e') container.env.push(value)
        index += 2
        continue
      }
      if (flag.startsWith('--restart=')) { index += 1; continue }
      container.image = flag
      break
    }
    if (this.containers.has(name)) return fail(`Error: the container name "${name}" is already in use`)
    for (const mount of container.mounts) if (mount.Type === 'volume') this.volumes.add(mount.Name)
    this.containers.set(name, container)
    return { exitCode: 0, stdout: `${name}-id\n`, stderr: '' }
  }

  private start(name: string): PodmanCommandResult {
    const container = this.containers.get(name)
    if (!container) return fail(`Error: no such container ${name}`)
    const failure = this.failNextStarts.shift()
    if (failure) return failure
    const pid = this.nextPid++
    container.status = 'running'
    container.pid = pid
    this.alivePids.add(pid)
    return OK
  }

  private remove(name: string): PodmanCommandResult {
    const container = this.containers.get(name)
    if (container) this.alivePids.delete(container.pid)
    this.containers.delete(name)
    return OK
  }

  private volume(sub: string, rest: string[]): PodmanCommandResult {
    const name = rest[rest.length - 1] ?? ''
    if (sub === 'exists') return this.volumes.has(name) ? OK : fail('', 1)
    if (sub === 'create') {
      this.volumes.add(name)
      const labels: Record<string, string> = {}
      for (let index = 0; index < rest.length - 1; index++) {
        if (rest[index] !== '--label') continue
        const [key, ...value] = (rest[index + 1] ?? '').split('=')
        labels[key ?? ''] = value.join('=')
      }
      this.volumeLabels.set(name, labels)
      return OK
    }
    return fail(`fake: volume ${sub} no modelado`, 1)
  }

  private network(sub: string, name: string): PodmanCommandResult {
    if (sub === 'exists') return this.networks.has(name) ? OK : fail('', 1)
    if (sub === 'create') { this.networks.add(name); return OK }
    return fail(`fake: network ${sub} no modelado`, 1)
  }

  private secret(args: readonly string[], stdin: string | undefined): PodmanCommandResult {
    const [sub, ...rest] = args
    const name = rest[rest.length - 1] === '-' ? (rest[rest.length - 2] ?? '') : (rest[rest.length - 1] ?? '')
    if (sub === 'inspect') {
      const secret = this.secrets.get(name)
      if (!secret) return fail(`Error: no secret with name or id "${name}"`)
      const formatAt = rest.indexOf('--format')
      const format = formatAt < 0 ? '' : (rest[formatAt + 1] ?? '')
      const labelKey = /index \.Spec\.Labels "([^"]+)"/.exec(format)?.[1]
      return { exitCode: 0, stdout: `${labelKey ? (secret.labels[labelKey] ?? '<no value>') : name}\n`, stderr: '' }
    }
    if (sub === 'create') {
      if (this.secrets.has(name) && !rest.includes('--replace')) return fail(`Error: ${name}: secret name in use`)
      const labels: Record<string, string> = {}
      rest.forEach((word, at) => { if (word === '--label') { const [k, v] = splitKeyValue(rest[at + 1] ?? ''); labels[k] = v } })
      this.secrets.set(name, { labels, value: stdin ?? '' })
      return { exitCode: 0, stdout: `${name}-id\n`, stderr: '' }
    }
    return fail(`fake: secret ${sub} no modelado`, 1)
  }
}

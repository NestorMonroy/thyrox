/**
 * Cómo sale a la red un trabajo de verificación que corre en la primitiva
 * de Podman (TASK-THYROX-0728).
 *
 * La dirección del proxy es una propiedad del anfitrión, no del código: se
 * declara en `THYROX_JOB_EGRESS_PROXY_URL` y, vacía, se hereda del
 * `HTTPS_PROXY` que el proceso anfitrión ya recibe. Lo mismo el bundle de
 * CA. Sin proxy en ninguna fuente, la salida es directa.
 *
 * El valor viaja como `--env` y queda en `podman inspect`, así que una URL
 * con usuario o contraseña se rehúsa en vez de propagarse.
 */
import type { WorkerNetworkMode, WorkerResourceMount } from '@thyrox/podman-execution/workerResourceProfile.ts'

export const JOB_EGRESS_ENV = {
  proxyUrl: 'THYROX_JOB_EGRESS_PROXY_URL',
  caBundle: 'THYROX_JOB_EGRESS_CA_BUNDLE',
} as const

const INHERITED_PROXY_ENV = ['HTTPS_PROXY', 'https_proxy'] as const
const INHERITED_CA_ENV = ['NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE'] as const

export type JobEgress =
  | { readonly kind: 'direct' }
  | { readonly kind: 'proxy'; readonly proxyUrl: string; readonly caBundlePath?: string }

export class JobEgressError extends Error {
  constructor(reason: string) {
    super(`salida de red del trabajo inválida: ${reason}`)
    this.name = 'JobEgressError'
  }
}

type Environment = Readonly<Record<string, string | undefined>>

function firstDeclared(env: Environment, names: readonly string[]): string | undefined {
  return names.map(name => env[name]?.trim()).find(value => !!value)
}

function requirePublicProxyUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new JobEgressError(`${value} no es una URL`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new JobEgressError(`${value} no es una URL http(s)`)
  if (url.username || url.password) throw new JobEgressError('la URL del proxy lleva credencial y quedaría en podman inspect')
  return value
}

export function resolveJobEgress(env: Environment): JobEgress {
  const proxyUrl = firstDeclared(env, [JOB_EGRESS_ENV.proxyUrl, ...INHERITED_PROXY_ENV])
  if (!proxyUrl) return { kind: 'direct' }
  const caBundlePath = firstDeclared(env, [JOB_EGRESS_ENV.caBundle, ...INHERITED_CA_ENV])
  return { kind: 'proxy', proxyUrl: requirePublicProxyUrl(proxyUrl), ...(caBundlePath ? { caBundlePath } : {}) }
}

/** Dónde ve el contenedor el bundle de CA del anfitrión, montado de sólo lectura. */
export const CONTAINER_CA_BUNDLE = '/certs/ca-bundle.crt'

/** La parte del perfil del trabajo que decide la salida: red, entorno del proxy y montaje del CA. */
export interface JobNetworkProfile {
  readonly network: Extract<WorkerNetworkMode, 'bridge' | 'host'>
  readonly environment: Readonly<Record<string, string>>
  readonly mounts: readonly WorkerResourceMount[]
}

/**
 * Directa, la red es `bridge`. Con proxy es `host`, porque el proxy declarado
 * vive en el loopback del anfitrión, y el trabajo recibe `HTTPS_PROXY` y, si
 * se declaró, el CA montado de sólo lectura.
 */
export function jobNetworkProfile(egress: JobEgress): JobNetworkProfile {
  if (egress.kind === 'direct') return { network: 'bridge', environment: {}, mounts: [] }
  const caBundle = egress.caBundlePath
  return {
    network: 'host',
    environment: { HTTPS_PROXY: egress.proxyUrl, ...(caBundle ? { NODE_EXTRA_CA_CERTS: CONTAINER_CA_BUNDLE } : {}) },
    mounts: caBundle ? [{ source: caBundle, destination: CONTAINER_CA_BUNDLE, mode: 'ro' }] : [],
  }
}

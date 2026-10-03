/**
 * Dónde está, en el anfitrión, el blob GGUF de un modelo instalado en el
 * Ollama gestionado: `/api/show` declara su ruta dentro del contenedor (línea
 * `FROM` del Modelfile) y `podman volume inspect` da el punto de montaje del
 * volumen de modelos (`THYROX_INFRA_OLLAMA_VOLUME`), montado en `/root/.ollama`
 * (`src/lib/infrastructure.sh`).
 */

import { spawn } from 'node:child_process'

/** Directorio del contenedor donde `infrastructure.sh` monta el volumen de modelos. */
export const CONTAINER_MODELS_DIR = '/root/.ollama'

const MOUNTPOINT_FORMAT = '{{.Mountpoint}}'
const BLOB_FROM_LINE = /^FROM\s+(\S*\/blobs\/sha256-([0-9a-f]{64}))\s*$/m
const SUCCESS_EXIT_CODE = 0

export class BlobLocationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlobLocationError'
  }
}

export interface ModelBlob {
  readonly containerPath: string
  /** Digest que el nombre del blob declara; quien lo lee lo verifica contra el contenido. */
  readonly sha256: string
}

interface CommandResult {
  readonly exitCode: number | null
  readonly stdout: string
  readonly stderr: string
}

/** El punto de montaje del volumen en el anfitrión. */
export async function volumeMountpoint(podmanBin: string, volume: string): Promise<string> {
  const result = await runPodman(podmanBin, ['volume', 'inspect', volume, '--format', MOUNTPOINT_FORMAT])
  if (result.exitCode !== SUCCESS_EXIT_CODE) {
    throw new BlobLocationError(`podman volume inspect ${volume} salió ${String(result.exitCode)}: ${result.stderr.trim()}`)
  }
  const mountpoint = result.stdout.trim()
  if (mountpoint === '') throw new BlobLocationError(`podman volume inspect ${volume} no dio punto de montaje`)
  return mountpoint
}

/** La capa del modelo que el Modelfile de `/api/show` declara en su `FROM`. */
export function modelBlobOfModelfile(modelfile: string): ModelBlob {
  const match = BLOB_FROM_LINE.exec(modelfile)
  if (!match) throw new BlobLocationError('el Modelfile no declara un FROM con un blob sha256-<64 hex>')
  return { containerPath: match[1] as string, sha256: match[2] as string }
}

/** La ruta del blob en el anfitrión: el prefijo del montaje cambia por el punto de montaje. */
export function hostBlobPath(containerPath: string, mountpoint: string): string {
  const prefix = `${CONTAINER_MODELS_DIR}/`
  if (!containerPath.startsWith(prefix)) {
    throw new BlobLocationError(`«${containerPath}» no está bajo ${CONTAINER_MODELS_DIR}, el directorio montado del volumen`)
  }
  return `${mountpoint.replace(/\/+$/, '')}/${containerPath.slice(prefix.length)}`
}

function runPodman(bin: string, args: readonly string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, [...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', error => reject(new BlobLocationError(`no se pudo lanzar ${bin}: ${error.message}`)))
    child.on('close', exitCode => resolve({ exitCode, stdout, stderr }))
  })
}

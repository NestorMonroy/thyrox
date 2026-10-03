/**
 * Dónde está el Ollama gestionado y con qué se inspecciona su volumen, leído
 * del mismo entorno que `src/lib/infrastructure.sh` declara: el puerto de
 * loopback (`THYROX_INFRA_OLLAMA_PORT`), el volumen de modelos
 * (`THYROX_INFRA_OLLAMA_VOLUME`) y el binario de Podman que el toolchain midió
 * (`THYROX_TOOLCHAIN_PODMAN_BIN`). Los valores por defecto son los de ese
 * archivo.
 */

export const OLLAMA_PORT_VAR = 'THYROX_INFRA_OLLAMA_PORT'
export const OLLAMA_VOLUME_VAR = 'THYROX_INFRA_OLLAMA_VOLUME'
export const PODMAN_BIN_VAR = 'THYROX_TOOLCHAIN_PODMAN_BIN'

const DEFAULT_OLLAMA_PORT = '51434'
const DEFAULT_OLLAMA_VOLUME = 'thyrox-ollama-models'
const DEFAULT_PODMAN_BIN = 'podman'
const LOOPBACK = '127.0.0.1'

export type Environment = Readonly<Record<string, string | undefined>>

export interface ManagedOllama {
  readonly baseUrl: string
  readonly volume: string
  readonly podmanBin: string
}

export function managedOllama(env: Environment): ManagedOllama {
  return {
    baseUrl: `http://${LOOPBACK}:${declared(env, OLLAMA_PORT_VAR) ?? DEFAULT_OLLAMA_PORT}`,
    volume: declared(env, OLLAMA_VOLUME_VAR) ?? DEFAULT_OLLAMA_VOLUME,
    podmanBin: declared(env, PODMAN_BIN_VAR) ?? DEFAULT_PODMAN_BIN,
  }
}

function declared(env: Environment, key: string): string | undefined {
  const value = env[key]?.trim()
  return value ? value : undefined
}

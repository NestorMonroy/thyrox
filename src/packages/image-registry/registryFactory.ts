/**
 * La factory de registros (TASK-THYROX-0725): la configuración nombra un
 * proveedor y esta tabla elige su adapter. Es el único sitio que conoce los
 * proveedores; un consumidor recibe un `ImageRegistry` y no sabe cuál es.
 */
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { createDockerHubRegistry, DOCKER_HUB_PROVIDER, DOCKER_HUB_REGISTRY } from './dockerHubRegistry.ts'
import type { ImageRegistry, RegistryAdministrator, RegistryAuth } from './imageRegistry.ts'
import { createOciRegistry } from './ociRegistry.ts'

export const GENERIC_OCI_PROVIDER = 'generic-oci'

export type RegistryConfig = { provider: string; registry?: string }

export type RegistryDependencies = {
  podman: PodmanExecutor
  auth?: RegistryAuth
  administrator?: RegistryAdministrator
}

type RegistryBuilder = (config: RegistryConfig, dependencies: RegistryDependencies) => ImageRegistry

export class UnknownRegistryProviderError extends Error {
  constructor(provider: string, known: readonly string[]) {
    super(`proveedor de registro desconocido '${provider}'; los declarados son: ${known.join(', ')}`)
    this.name = 'UnknownRegistryProviderError'
  }
}

export class InvalidRegistryConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRegistryConfigError'
  }
}

const REGISTRY_BUILDERS: Readonly<Record<string, RegistryBuilder>> = {
  [DOCKER_HUB_PROVIDER]: (config, dependencies) => {
    if (config.registry !== undefined && config.registry !== DOCKER_HUB_REGISTRY) {
      throw new InvalidRegistryConfigError(`el proveedor ${DOCKER_HUB_PROVIDER} opera sobre ${DOCKER_HUB_REGISTRY}, no sobre ${config.registry}`)
    }
    return createDockerHubRegistry(dependencies)
  },
  [GENERIC_OCI_PROVIDER]: (config, dependencies) => {
    if (config.registry === undefined || config.registry === '') {
      throw new InvalidRegistryConfigError(`el proveedor ${GENERIC_OCI_PROVIDER} exige declarar el registro`)
    }
    return createOciRegistry({ provider: GENERIC_OCI_PROVIDER, registry: config.registry, ...dependencies })
  },
}

export const REGISTRY_PROVIDERS: readonly string[] = Object.keys(REGISTRY_BUILDERS)

export function createImageRegistry(config: RegistryConfig, dependencies: RegistryDependencies): ImageRegistry {
  const build = REGISTRY_BUILDERS[config.provider]
  if (build === undefined) throw new UnknownRegistryProviderError(config.provider, REGISTRY_PROVIDERS)
  return build(config, dependencies)
}

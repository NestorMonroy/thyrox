/**
 * Las operaciones administrativas de Docker Hub (TASK-THYROX-0725): crear un
 * repositorio, cambiar su visibilidad y borrarlo. No son OCI: son la API
 * propia de Docker Hub, y por eso viven sólo en su adapter.
 *
 * La API no guarda la credencial: cada operación la pide a `credentials`, abre
 * una sesión con ella (`POST /v2/users/login`, que acepta un PAT como
 * contraseña) y la usa para esa única petición.
 *
 * pendiente: las rutas de la API se declararon a partir de su documentación;
 * no se midieron contra Docker Hub hasta que corra la prueba de integración
 * (`THYROX_REGISTRY_INTEGRATION=dockerhub`).
 */
import type { RegistryAdministrator, RepositoryVisibility } from './imageRegistry.ts'

export const DOCKER_HUB_API_BASE = 'https://hub.docker.com'

export type HubCredentials = () => { username: string; token: string }

export type HubFetch = (url: string, init: RequestInit) => Promise<Response>

export class DockerHubApiError extends Error {
  constructor(operation: string, status: number, detail: string) {
    super(`Docker Hub rechazó ${operation} con HTTP ${status}${detail === '' ? '' : `: ${detail}`}`)
    this.name = 'DockerHubApiError'
  }
}

type RepositoryPath = { namespace: string; name: string }

function splitRepository(repository: string): RepositoryPath {
  const [namespace, name, extra] = repository.split('/')
  if (namespace === undefined || name === undefined || extra !== undefined || namespace === '' || name === '') {
    throw new Error(`un repositorio de Docker Hub es <namespace>/<nombre>; llegó «${repository}»`)
  }
  return { namespace, name }
}

async function failureDetail(response: Response): Promise<string> {
  return (await response.text()).slice(0, 200)
}

export function createDockerHubAdminApi(options: { credentials: HubCredentials; fetch?: HubFetch; baseUrl?: string }): Required<
  Pick<RegistryAdministrator, 'createRepository' | 'setVisibility' | 'deleteRepository'>
> {
  const fetchFn = options.fetch ?? fetch
  const baseUrl = options.baseUrl ?? DOCKER_HUB_API_BASE

  async function session(): Promise<string> {
    const { username, token } = options.credentials()
    const response = await fetchFn(`${baseUrl}/v2/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: token }),
    })
    if (!response.ok) throw new DockerHubApiError('el inicio de sesión', response.status, '')
    const body = (await response.json()) as { token?: string }
    if (typeof body.token !== 'string' || body.token === '') throw new DockerHubApiError('el inicio de sesión', response.status, 'respuesta sin token')
    return body.token
  }

  async function call(operation: string, method: string, path: string, payload?: unknown): Promise<void> {
    const bearer = await session()
    const response = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    })
    if (!response.ok) throw new DockerHubApiError(operation, response.status, await failureDetail(response))
  }

  return {
    async createRepository(repository: string, visibility: RepositoryVisibility) {
      const { namespace, name } = splitRepository(repository)
      await call(`crear ${repository}`, 'POST', '/v2/repositories/', { namespace, name, is_private: visibility === 'private' })
    },
    async setVisibility(repository: string, visibility: RepositoryVisibility) {
      const { namespace, name } = splitRepository(repository)
      await call(`cambiar la visibilidad de ${repository}`, 'PATCH', `/v2/repositories/${namespace}/${name}/`, { is_private: visibility === 'private' })
    },
    async deleteRepository(repository: string) {
      const { namespace, name } = splitRepository(repository)
      await call(`borrar ${repository}`, 'DELETE', `/v2/repositories/${namespace}/${name}/`)
    },
  }
}

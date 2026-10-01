/**
 * Lo propio del adapter de Docker Hub: alias del registro, imágenes oficiales
 * y su API administrativa, que pide la credencial en cada operación y no la
 * guarda.
 */
import { describe, expect, test } from 'bun:test'

import { createDockerHubAdminApi, DockerHubApiError } from '../dockerHubAdminApi.ts'
import { createDockerHubRegistry, normalizeDockerHubReference } from '../dockerHubRegistry.ts'
import { requireAdministration } from '../imageRegistry.ts'
import { createFakePodmanRegistry } from '../testing/fakePodmanRegistry.ts'

const TOKEN = 'dckr_pat_SECRET-admin-0123456789'

type Recorded = { url: string; method: string; headers: Record<string, string>; body?: string }

function fakeHub(status: Record<string, number> = {}): { fetch: (url: string, init: RequestInit) => Promise<Response>; requests: Recorded[] } {
  const requests: Recorded[] = []
  return {
    requests,
    async fetch(url, init) {
      requests.push({ url, method: init.method ?? 'GET', headers: (init.headers ?? {}) as Record<string, string>, ...(typeof init.body === 'string' ? { body: init.body } : {}) })
      if (url.endsWith('/v2/users/login')) return Response.json({ token: `jwt-${requests.length}` }, { status: status.login ?? 200 })
      return new Response('', { status: status[init.method ?? 'GET'] ?? 201 })
    },
  }
}

describe('referencias de Docker Hub', () => {
  test('los alias del registro se llevan a docker.io y una imagen oficial a library/', () => {
    expect(normalizeDockerHubReference({ registry: 'index.docker.io', repository: 'ubuntu', tag: '24.04' })).toEqual({ registry: 'docker.io', repository: 'library/ubuntu', tag: '24.04' })
    expect(normalizeDockerHubReference({ registry: 'docker.io', repository: 'th3rox/q' })).toEqual({ registry: 'docker.io', repository: 'th3rox/q' })
    expect(normalizeDockerHubReference({ registry: 'ghcr.io', repository: 'x' })).toEqual({ registry: 'ghcr.io', repository: 'x' })
  })
})

describe('capacidades administrativas', () => {
  test('sin API administrativa el adapter sólo declara el núcleo', () => {
    const registry = createDockerHubRegistry({ podman: createFakePodmanRegistry() })
    expect([...registry.capabilities].sort()).toEqual(['inspect', 'pull', 'push', 'resolve'])
    expect(() => requireAdministration(registry, 'createRepository')).toThrow(/createRepository/)
  })

  test('con la API declara crear, cambiar visibilidad y borrar repositorios, y no borrar imágenes', () => {
    const hub = fakeHub()
    const administrator = createDockerHubAdminApi({ credentials: () => ({ username: 'th3rox', token: TOKEN }), fetch: hub.fetch })
    const registry = createDockerHubRegistry({ podman: createFakePodmanRegistry(), administrator })
    for (const capability of ['createRepository', 'setVisibility', 'deleteRepository']) expect(registry.capabilities.has(capability as never)).toBe(true)
    expect(registry.capabilities.has('deleteImage')).toBe(false)
  })

  test('cada operación abre su sesión con la credencial y usa el bearer, no el PAT', async () => {
    const hub = fakeHub()
    let asked = 0
    const administrator = createDockerHubAdminApi({ credentials: () => (asked++, { username: 'th3rox', token: TOKEN }), fetch: hub.fetch })
    await administrator.createRepository('th3rox/thyrox-model-quantizer', 'public')
    await administrator.setVisibility('th3rox/thyrox-model-quantizer', 'private')
    expect(asked).toBe(2)
    const [login, create] = hub.requests
    expect(login?.body).toContain(TOKEN)
    expect(create?.url).toBe('https://hub.docker.com/v2/repositories/')
    expect(JSON.parse(create?.body ?? '{}')).toEqual({ namespace: 'th3rox', name: 'thyrox-model-quantizer', is_private: false })
    expect(create?.headers.Authorization).toBe('Bearer jwt-1')
    expect(hub.requests.filter(request => !request.url.endsWith('/login')).map(request => JSON.stringify(request))).not.toContain(TOKEN)
    expect(JSON.stringify(administrator)).not.toContain(TOKEN)
  })

  test('un rechazo nombra la operación y el estado HTTP, sin el PAT', async () => {
    const hub = fakeHub({ DELETE: 403 })
    const administrator = createDockerHubAdminApi({ credentials: () => ({ username: 'th3rox', token: TOKEN }), fetch: hub.fetch })
    const attempt = administrator.deleteRepository('th3rox/thyrox-model-quantizer')
    await expect(attempt).rejects.toBeInstanceOf(DockerHubApiError)
    await attempt.catch(error => {
      expect(String(error)).toMatch(/borrar th3rox\/thyrox-model-quantizer.*403/)
      expect(String(error)).not.toContain(TOKEN)
    })
  })

  test('un repositorio que no es namespace/nombre rehúsa antes de llamar', async () => {
    const hub = fakeHub()
    const administrator = createDockerHubAdminApi({ credentials: () => ({ username: 'th3rox', token: TOKEN }), fetch: hub.fetch })
    await expect(administrator.createRepository('solo', 'public')).rejects.toThrow(/namespace/)
    expect(hub.requests).toEqual([])
  })
})

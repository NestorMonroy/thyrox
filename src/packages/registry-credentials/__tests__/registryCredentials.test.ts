/**
 * Credencial de registro por rol (TASK-THYROX-0725). El secreto del
 * publicador vive sólo mientras dura el push, en un authfile 0600 dentro de un
 * directorio 0700 fuera del workspace, y no aparece en argv, en el workspace,
 * en un error ni al serializar la credencial.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { MissingRegistryCredentialError, PUBLISHER_ENV, resolvePublisherCredential } from '../registryCredential.ts'
import { AuthFileLocationError, credentialPairOf, registryAuthFor, withRegistryAuthFile } from '../registryAuthFile.ts'

const TOKEN = 'dckr_pat_SECRET-test-token-0123456789'
const ENV = { [PUBLISHER_ENV.username]: 'thyrox', [PUBLISHER_ENV.token]: TOKEN }
function scratch(): string {
  return mkdtempSync(join(tmpdir(), 'registry-credentials-test-'))
}

describe('credencial del publicador', () => {
  test('sin las dos variables rehúsa nombrándolas, sin mostrar ningún valor', () => {
    expect(() => resolvePublisherCredential({ [PUBLISHER_ENV.username]: 'thyrox' })).toThrow(MissingRegistryCredentialError)
    expect(() => resolvePublisherCredential({ [PUBLISHER_ENV.token]: TOKEN })).toThrow(new RegExp(PUBLISHER_ENV.username))
    try {
      resolvePublisherCredential({ [PUBLISHER_ENV.token]: TOKEN })
    } catch (error) {
      expect(String(error)).not.toContain(TOKEN)
    }
  })

  test('el registro por defecto es docker.io, y serializar la credencial no muestra el token', () => {
    const credential = resolvePublisherCredential(ENV)
    expect(credential.registry).toBe('docker.io')
    expect(credential.username).toBe('thyrox')
    expect(JSON.stringify(credential)).not.toContain(TOKEN)
    expect(String(credential)).not.toContain(TOKEN)
    expect(Bun.inspect(credential)).not.toContain(TOKEN)
  })
})

describe('authfile temporal', () => {
  test('existe 0600 en un directorio 0700 mientras corre el cuerpo, y desaparece después', async () => {
    const runtime = scratch()
    let seen = ''
    await withRegistryAuthFile(resolvePublisherCredential(ENV), async authFile => {
      seen = authFile
      expect(statSync(authFile).mode & 0o777).toBe(0o600)
      expect(statSync(join(authFile, '..')).mode & 0o777).toBe(0o700)
      const auths = JSON.parse(readFileSync(authFile, 'utf8')).auths
      expect(Buffer.from(auths['docker.io'].auth, 'base64').toString()).toBe(`thyrox:${TOKEN}`)
    }, { runtimeDir: runtime, workspaceRoots: [] })
    expect(existsSync(seen)).toBe(false)
    expect(readdirSync(runtime)).toEqual([])
  })

  test('también desaparece si el cuerpo falla, y el error no lleva el token', async () => {
    const runtime = scratch()
    const failure = withRegistryAuthFile(resolvePublisherCredential(ENV), async () => {
      throw new Error(`push rejected for thyrox:${TOKEN}`)
    }, { runtimeDir: runtime, workspaceRoots: [] })
    await expect(failure).rejects.toThrow(/push rejected/)
    await failure.catch(error => expect(String(error)).not.toContain(TOKEN))
    expect(readdirSync(runtime)).toEqual([])
  })

  test('rehúsa un directorio dentro del workspace', async () => {
    const workspace = scratch()
    await expect(
      withRegistryAuthFile(resolvePublisherCredential(ENV), async () => 'nunca', { runtimeDir: join(workspace, '.claude'), workspaceRoots: [workspace] }),
    ).rejects.toBeInstanceOf(AuthFileLocationError)
  })
})

describe('puerto RegistryAuth', () => {
  test('registryAuthFor entrega la ruta y la retira; credentialPairOf da el par en cada llamada', async () => {
    const runtime = scratch()
    const credential = resolvePublisherCredential(ENV)
    const seen = await registryAuthFor(credential, { runtimeDir: runtime, workspaceRoots: [] }).withAuthFile(async path => path)
    expect(existsSync(seen)).toBe(false)
    expect(credentialPairOf(credential)()).toEqual({ username: 'thyrox', token: TOKEN })
  })
})

describe('contrato de nombres', () => {
  test('las variables del publicador se llaman así en el entorno que publica', () => {
    expect(PUBLISHER_ENV).toEqual({
      username: 'THYROX_REGISTRY_PUBLISHER_USERNAME',
      token: 'THYROX_REGISTRY_PUBLISHER_TOKEN',
      registry: 'THYROX_REGISTRY_PUBLISHER_REGISTRY',
    })
  })
})

/**
 * TASK-THYROX-0324 (B): `getFrequentlyModifiedFiles` no corta por
 * `NODE_ENV === 'test'`. La función equivalente del ejecutable 2.1.283
 * (`bd`, chunk-bdv29443) empieza en `platform === "win32"` y no lee
 * `NODE_ENV`. Las dependencias cruzadas se inyectan con `mock.module`.
 */
import { expect, mock, test } from 'bun:test'
import * as real from '../internal/pendingCrossPackageDeps.ts'

const stdout = Array.from({ length: 12 }, (_, i) => `src/mod${i}/file${i}.ts`)
  .flatMap(f => [f, f])
  .join('\n')

mock.module('../internal/pendingCrossPackageDeps.js', () => ({
  ...real,
  requireConfigEnv: () => ({ env: { platform: 'linux' } }),
  requireStorageGit: () => ({
    getIsGit: async () => true,
    gitExe: () => 'git',
  }),
  requireProviderUser: () => ({ getGitEmail: async () => '' }),
  requireShellExecFileNoThrow: () => ({
    execFileNoThrowWithCwd: async () => ({ stdout, stderr: '', code: 0 }),
  }),
  requireAppHostCwd: () => ({ getCwd: () => '/tmp' }),
}))

const { getFrequentlyModifiedFiles } = await import('../exampleCommands.ts')

test('bajo NODE_ENV=test consulta el historial como en producción', async () => {
  expect(process.env.NODE_ENV).toBe('test')
  const files = await getFrequentlyModifiedFiles()
  expect(files).toHaveLength(5)
})

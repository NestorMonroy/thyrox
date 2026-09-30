/**
 * TASK-THYROX-0324 (B): el umbral de operación lenta no depende de
 * `NODE_ENV`. En el ejecutable 2.1.283 (`Lr`, chunk-zkn0228z) es la variable
 * `CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS` o `Infinity`; no existe el 20 ms
 * de `NODE_ENV === 'development'`. El módulo lee el entorno al cargarse, así
 * que se mide en un proceso hijo.
 */
import { expect, test } from 'bun:test'

function thresholdWith(env: Record<string, string>): string {
  const p = Bun.spawnSync({
    cmd: [
      process.execPath,
      '-e',
      "import('./src/slowLoggingTag.ts').then(m=>console.log(String(m.SLOW_OPERATION_THRESHOLD_MS)))",
    ],
    cwd: new URL('..', import.meta.url).pathname,
    env: { PATH: process.env.PATH ?? '', ...env },
  })
  return p.stdout.toString().trim()
}

test('NODE_ENV=development sin variable de umbral da Infinity', () => {
  expect(thresholdWith({ NODE_ENV: 'development' })).toBe('Infinity')
})

test('la variable de umbral sigue mandando', () => {
  expect(
    thresholdWith({
      NODE_ENV: 'development',
      THYROX_CODE_SLOW_OPERATION_THRESHOLD_MS: '7',
    }),
  ).toBe('7')
})

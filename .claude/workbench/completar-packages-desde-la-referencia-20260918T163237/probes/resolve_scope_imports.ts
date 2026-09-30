const especificadores = [
  '@thyrox/app-host/bootstrap/cwd.js',
  '@thyrox/config/feature-flags',
  '@thyrox/config/env',
  '@thyrox/config/env/utils',
  '@thyrox/local-observability',
  '@thyrox/config/settings',
  '@thyrox/config',
]
const base = '/home/user/thyrox/src/packages/agent/internal'
for (const e of especificadores) {
  try {
    console.log('OK   ', e, '->', Bun.resolveSync(e, base))
  } catch (err) {
    console.log('FALLA', e, '->', (err as Error).message.split('\n')[0])
  }
}

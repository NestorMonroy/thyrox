/**
 * Oráculo diferencial de `chunk-jwddn0q9.js` (2.1.283): el módulo se evalúa
 * con sus importaciones sustituidas —`a` lee el mismo entorno generado con el
 * intérprete de cada variable y el nombre `THYROX_CODE_*`, `q`/`j` dan un
 * anfitrión por escenario, `Te` y `dR` salen del escenario— y en cada uno se
 * inicializa el estado (`NUo`) y se comparan todos los predicados y el
 * entorno resultante con el porte.
 */
import * as port from '../../../../src/packages/config/entrypoint.ts'

const raw = await Bun.file('_references/claude-code-bin/2.1.283/bunfs-root/chunk-jwddn0q9.js').text()
const body = raw
  .replace(/import\{[^}]*\}from"[^"]+";/g, '')
  .replace(/export\s*\{([^}]*)\}\s*;?\s*$/, (_, names: string) => `return {${names}}`)
const factory = new Function('Le', 'q', 'j', 'Te', 'dR', 'a', body)

const STR = ['ENTRYPOINT', 'DESKTOP_APP_VERSION', 'HOST_CREDS_FILE', 'HIDE_SETTINGS_HINT', 'ACTION', 'SESSION_KIND']
const BOOL = ['PROVIDER_MANAGED_BY_HOST', 'USE_GATEWAY', 'HOST_GATEWAY_LINEAGE', 'REMOTE', 'CHILD_SESSION', 'COWORK_FRAME_ARTIFACTS', 'HOST_SCHEDULED_RUN']
const TRI = ['SESSION_ATTENDED']
const ours = (name: string) => (name === 'CLAUDECODE' ? 'CLAUDECODE' : name.replace(/^CLAUDE_CODE_/, 'THYROX_CODE_'))

function accessor(env: Record<string, string | undefined>) {
  return new Proxy(
    {},
    {
      get(_, key: string) {
        if (key === 'set') return (name: string, value: string) => void (env[ours(name)] = value)
        const suffix = key.replace(/^CLAUDE_CODE_/, '')
        const value = env[ours(key)]
        if (key === 'CLAUDECODE' || BOOL.includes(suffix)) return port.isTruthyFlag(value)
        if (TRI.includes(suffix)) return port.isTruthyFlag(value) ? true : port.isFalsyFlag(value) ? false : undefined
        if (STR.includes(suffix)) {
          const trimmed = value?.trim()
          return trimmed ? trimmed : undefined
        }
        throw new Error(`variable sin intérprete: ${key}`)
      },
    },
  )
}

let seed = 20260928
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
const entrypoints = [...Object.keys(port.KNOWN_ENTRYPOINTS), 'desconocido', ' cli ', '', 'remote_otro', 'sdk-x']
const flags = [undefined, '', '1', 'true', ' YES ', 'on', '0', 'false', 'no', 'off', 'x']
const argvs = [[], ['mcp', 'serve'], ['mcp'], ['-r'], ['--resume=abc'], ['--from-pr'], ['-c'], ['--continue'], ['--', '-r'], ['x', '--from-pr=1']]

const predicates = [
  'Nd', 'RUo', 'Gc', 'Shn', 'ixe', 'ere', 'k_e', 'Rz', 'kYn', 'xz', 'Iz', 'Q8e', 'TA', 'PUo', 'nBe', 'whn', 'vhn', 'TGr', 'OUo',
  'HUo', 'tN', 'nN', 'vde', 'MUo', 'Ehn', 'yu', 'Z8e', 'DUo', 'Ww', 'Jx', 'AGr', 'LUo',
] as const
/** El nombre del anfitrión sin la marca: la referencia muestra la suya y el porte la del producto. */
const displaySuffix = (name: string | undefined) => (name !== undefined && name.includes(' ') ? name.split(' ').slice(1).join(' ') : name)
const portOf = new Map<string, (ctx: port.EntrypointContext) => unknown>([
  ['ctx', port.EntrypointContext],
  ['Nd', port.declaredEntrypoint],
  ['RUo', ctx => displaySuffix(port.hostDisplayName(ctx))],
  ['Gc', port.isDesktopEntrypoint],
  ['Shn', port.desktopAppVersion],
  ['ixe', port.isThirdPartyDesktopEntrypoint],
  ['ere', port.isTopLevelDesktopAppSession],
  ['k_e', port.isRemoteTriggerEntrypoint],
  ['Rz', port.isHostManagedGateway],
  ['kYn', port.isHostGatewayLineageManaged],
  ['xz', port.isRemoteCoworkEntrypoint],
  ['Iz', port.isCoworkEntrypoint],
  ['Q8e', port.isCoworkSession],
  ['TA', port.isSlackEntrypoint],
  ['PUo', port.isSlackSession],
  ['nBe', port.isTeamsEntrypoint],
  ['whn', port.isChatAppEntrypoint],
  ['vhn', port.isRemoteHostedEntrypoint],
  ['TGr', port.isRemotePrefixedEntrypoint],
  ['OUo', port.isRemoteControlSession],
  ['HUo', port.showsSettingsHint],
  ['tN', port.isSdkEntrypoint],
  ['nN', port.hostEntrypoint],
  ['vde', port.isAttendedSession],
  ['MUo', port.spawnedByAttendedSession],
  ['Ehn', port.isChildSession],
  ['yu', port.isTopLevelDesktopSession],
  ['Z8e', port.isTopLevelCoworkOrLocalAgentSession],
  ['DUo', port.isTopLevelRemoteSession],
  ['Ww', port.isTopLevelVsCodeSession],
  ['Jx', port.isInsideAgentShell],
  ['AGr', port.coworkFrameArtifacts],
  ['LUo', port.isHostScheduledRun],
])

let mismatches = 0
const report: string[] = []
const check = (label: string, left: unknown, right: unknown) => {
  const a = JSON.stringify(left) ?? 'undefined'
  const b = JSON.stringify(right) ?? 'undefined'
  if (a !== b) {
    mismatches++
    if (report.length < 6) report.push(`${label}: ours=${a} ref=${b}`)
  }
}

const scenarios = 20000
const savedArgv = process.argv
for (let run = 0; run < scenarios; run++) {
  const env: Record<string, string | undefined> = {}
  if (random() < 0.8) env.THYROX_CODE_ENTRYPOINT = pick(entrypoints)
  for (const suffix of [...BOOL, ...TRI, 'HIDE_SETTINGS_HINT', 'ACTION']) if (random() < 0.4) env[`THYROX_CODE_${suffix}`] = pick(flags)
  if (random() < 0.4) env.CLAUDECODE = pick(flags)
  if (random() < 0.3) env.THYROX_CODE_DESKTOP_APP_VERSION = pick(['1.2.3', ' ', ''])
  if (random() < 0.3) env.THYROX_CODE_HOST_CREDS_FILE = pick(['/c', ' ', ''])
  if (random() < 0.3) env.THYROX_CODE_SESSION_KIND = pick(['bg', 'daemon', 'daemon-worker', 'x', ' bg '])
  const referenceEnv = { ...env }
  const nonInteractive = random() < 0.5
  const teammate = random() < 0.2 ? pick(['', 'a1']) : undefined
  const argv = pick(argvs)
  const argInteractive = random() < 0.3 ? undefined : random() < 0.5

  process.argv = ['bun', 'cli', ...argv]
  const host = {}
  class PerHost { constructor(private readonly make: () => unknown) {} private value: unknown; of() { return (this.value ??= this.make()) } }
  const reference = factory(port.isTruthyFlag, PerHost, () => ({ host }), () => nonInteractive, () => teammate, accessor(referenceEnv))
  reference.NUo(nonInteractive)

  const ctx: port.EntrypointContext = { env, state: new port.EntrypointHostState(), teammateAgentId: () => teammate, isNonInteractive: () => nonInteractive, argv: () => ['bun', 'cli', ...argv] }
  port.initializeEntrypointHostState(nonInteractive, ctx)

  check('env', env, referenceEnv)
  for (const name of predicates) check(name, portOf.get(name)!(ctx), name === 'RUo' ? displaySuffix(reference.RUo()) : reference[name]())
  check('P6', port.isUnhostedNonInteractive(argInteractive, ctx), reference.P6(argInteractive))
  const probe = pick(entrypoints)
  check('l', port.isKnownEntrypoint(probe), reference.vYn[probe] === true && true)
  check('i1t', port.isDesktopEntrypointName(probe), reference.i1t(probe))
  const embedded = random() < 0.1 ? undefined : probe
  check('xUo', port.isEmbeddedEntrypoint(embedded), reference.xUo(embedded))
  check('$Uo', port.launchResumeMode(argv), reference.$Uo(argv))
}
process.argv = savedArgv
console.log(`escenarios=${scenarios} discrepancias=${mismatches}`)
for (const line of report) console.log(line.slice(0, 400))
process.exit(mismatches === 0 ? 0 : 1)

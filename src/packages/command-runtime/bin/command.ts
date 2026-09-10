#!/usr/bin/env bun
/**
 * La puerta al runtime de comandos: slash commands, sustitución de
 * argumentos, y el descubrimiento de skills.
 *
 * El defecto que cierra. `command-runtime` decide qué se ejecuta cuando
 * alguien escribe un slash-command o carga un directorio de skills — y sus
 * 14 módulos de producto tenían CERO puertas: probados, y sólo alcanzables
 * escribiendo código nuevo. Medido con
 * `.claude/eventos/puertas-cli-faltantes-20260907T020525/probes/census_cli_doors.py`:
 * `command-runtime  0  0  14  14` — cero puertas alcanzan cero de catorce.
 *
 * Subcomandos:
 *   parse-slash <entrada> [--stacked] [--json]
 *     parseSlashCommand / parseStackedSlashCommands
 *   substitute [--template T] [--args A] [--names "a b"] [--no-append]
 *     substituteArguments — T por --template o por stdin si se omite
 *   argument-hint --names "a b c" [--typed "a b"]
 *     parseArgumentNames + generateProgressiveArgumentHint
 *   skills-path <fuente> <skills|commands>
 *     getSkillsPath
 *   managed-path
 *     getManagedFilePath + getManagedSettingsDropInDir
 *   estimate-tokens [--name N] [--description D] [--when-to-use W]
 *     estimateSkillFrontmatterTokens
 *   command-info --name N [--user-facing-name U] [--enabled true|false]
 *     getCommandName + isCommandEnabled
 *   gitignore-path
 *     getGlobalGitignorePath
 *   moved-message --plugin-name P --plugin-command C [--ant] [--args A]
 *     createMovedToPluginCommand(...).getPromptForCommand
 *   fork-slug <directiva>
 *     deriveForkSlug
 *   ultrareview-enabled
 *     isUltrareviewEnabled
 *   plugin-args <args>
 *     parsePluginArgs
 *   exec-shell [--file F] [--shell bash|powershell]
 *     executeShellCommandsInPrompt — el texto por --file o por stdin
 *   xml tags
 *     lista las constantes de etiqueta XML (nombre=valor)
 *   xml skill-loading <nombre>
 *     formatSkillLoadingMetadata
 *   errors list
 *     la taxonomía de las 5 clases de error (nombre, code)
 *   errors raise <clase> [mensaje]
 *     construye y lanza la clase pedida, y reporta lo que trae
 *
 * Salidas: 0 con resultado · 2 si falta una precondición o el argumento no
 * parsea, SIN emitir veredicto — nunca una lectura por defecto, que sería
 * adivinar. `exec-shell` reserva el 1 para la divergencia YA documentada
 * (BashTool no portado, DEC-04): no es una precondición ausente, es el
 * mecanismo real llegando hasta donde el árbol lo permite.
 */
import { parseArgumentNames, parseArguments, generateProgressiveArgumentHint, substituteArguments } from '../src/argumentSubstitution.js'
import { parseSlashCommand, parseStackedSlashCommands } from '../src/slashCommandParsing.js'
import { getSkillsPath, estimateSkillFrontmatterTokens, type SettingSource } from '../src/skills/loadSkillsDir.js'
import { getManagedFilePath, getManagedSettingsDropInDir } from '../src/skills/managedPath.js'
import { getCommandName, isCommandEnabled, type CommandBase } from '../src/types.js'
import { getGlobalGitignorePath } from '../src/gitignore.js'
import { createMovedToPluginCommand } from '../src/createMovedToPluginCommand.js'
import { deriveForkSlug } from '../src/commands/fork/fork.js'
import { isUltrareviewEnabled } from '../src/commands/review/ultrareviewEnabled.js'
import { parsePluginArgs } from '../src/commands/plugin/parseArgs.js'
import { executeShellCommandsInPrompt } from '../src/promptShellExecution.js'
import * as xmlTags from '../src/xml.js'
import { formatSkillLoadingMetadata } from '../src/xml.js'
import { CommandRuntimeBaseError, CommandNotFoundError, CommandResolutionError, CommandExecutionError, HostBindingsError } from '../src/errors.js'

const EXIT_GUARD = 2
const EXIT_DIVERGENCIA = 1

const SUBCOMANDOS = [
  'parse-slash', 'substitute', 'argument-hint', 'skills-path', 'managed-path',
  'estimate-tokens', 'command-info', 'gitignore-path', 'moved-message',
  'fork-slug', 'ultrareview-enabled', 'plugin-args', 'exec-shell', 'xml', 'errors',
] as const

const FUENTES_SKILLS_PATH: readonly (SettingSource | 'plugin')[] = [
  'userSettings', 'projectSettings', 'localSettings', 'flagSettings',
  'policySettings', 'plugin',
]

const CLASES_ERROR = {
  'not-found': CommandNotFoundError,
  resolution: CommandResolutionError,
  execution: CommandExecutionError,
  'host-bindings': HostBindingsError,
} as const
type ClaveError = keyof typeof CLASES_ERROR

/** Muere con EXIT_GUARD y SIN emitir veredicto: adivinar es el defecto que este guion existe para cerrar. */
function guard(mensaje: string): never {
  console.error(`ERROR — ${mensaje}. NO se emite un veredicto.`)
  process.exit(EXIT_GUARD)
}

function opcion(argv: string[], nombre: string, defecto: string): string {
  const i = argv.indexOf(nombre)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1]! : defecto
}

function opcionPresente(argv: string[], nombre: string): boolean {
  return argv.includes(nombre)
}

function usage(): string {
  return [
    'uso: bun run bin/command.ts <subcomando> [args...]',
    '',
    `  subcomandos  ${SUBCOMANDOS.join(' | ')}`,
    '',
    '  parse-slash <entrada> [--stacked] [--json]',
    '  substitute [--template T] [--args A] [--names "a b"] [--no-append]',
    '  argument-hint --names "a b c" [--typed "a b"]',
    `  skills-path <fuente> <skills|commands>   fuente: ${FUENTES_SKILLS_PATH.join('|')}`,
    '  managed-path',
    '  estimate-tokens [--name N] [--description D] [--when-to-use W]',
    '  command-info --name N [--user-facing-name U] [--enabled true|false]',
    '  gitignore-path',
    '  moved-message --plugin-name P --plugin-command C [--ant] [--args A]',
    '  fork-slug <directiva>',
    '  ultrareview-enabled',
    '  plugin-args <args>',
    '  exec-shell [--file F] [--shell bash|powershell]   (lee stdin si falta --file)',
    '  xml tags',
    '  xml skill-loading <nombre>',
    '  errors list',
    `  errors raise <clase> [mensaje]   clase: ${Object.keys(CLASES_ERROR).join('|')}`,
  ].join('\n')
}

async function leerEntrada(argv: string[], bandera: string): Promise<string> {
  const i = argv.indexOf(bandera)
  if (i >= 0 && argv[i + 1] !== undefined) return argv[i + 1]!
  return (await Bun.stdin.text()).replace(/\n$/, '')
}

async function main(argv: string[]): Promise<number> {
  const orden = argv[0]

  if (opcionPresente(argv, '-h') || opcionPresente(argv, '--help')) {
    console.log(usage())
    return orden ? 0 : EXIT_GUARD
  }
  if (!orden) {
    console.log(usage())
    return EXIT_GUARD
  }
  if (!(SUBCOMANDOS as readonly string[]).includes(orden)) {
    guard(`subcomando desconocido: «${orden}». Use ${SUBCOMANDOS.join(' | ')}`)
  }

  const rest = argv.slice(1)

  if (orden === 'parse-slash') {
    const entrada = rest.filter((a) => !a.startsWith('--')).join(' ')
    if (!entrada) guard('falta la entrada. Ejemplo: parse-slash "/deploy prod"')
    const apilado = opcionPresente(rest, '--stacked')
    const resultado = apilado
      ? parseStackedSlashCommands(entrada)
      : parseSlashCommand(entrada)
    if (resultado === null) {
      guard(`«${entrada}» no parsea como slash command${apilado ? ' apilado (hacen falta ≥2 /comando)' : ' (debe empezar con /)'}`)
    }
    if (opcionPresente(rest, '--json')) {
      console.log(JSON.stringify(resultado))
    } else if ('commandNames' in resultado) {
      console.log(`comandos: ${resultado.commandNames.join(', ')}`)
      console.log(`args:     ${resultado.args}`)
    } else {
      console.log(`comando: ${resultado.commandName}`)
      console.log(`args:    ${resultado.args}`)
      console.log(`mcp:     ${resultado.isMcp}`)
    }
    return 0
  }

  if (orden === 'substitute') {
    const template = await leerEntrada(rest, '--template')
    const argsPresente = opcionPresente(rest, '--args')
    const args = argsPresente ? opcion(rest, '--args', '') : undefined
    const nombresRaw = opcion(rest, '--names', '')
    const nombres = nombresRaw ? parseArgumentNames(nombresRaw) : []
    const conApendice = !opcionPresente(rest, '--no-append')
    console.log(substituteArguments(template, args, conApendice, nombres))
    return 0
  }

  if (orden === 'argument-hint') {
    const nombresRaw = opcion(rest, '--names', '')
    if (!nombresRaw) guard('falta --names, ej. --names "a b c"')
    const nombres = parseArgumentNames(nombresRaw)
    const tecleado = parseArguments(opcion(rest, '--typed', ''))
    const hint = generateProgressiveArgumentHint(nombres, tecleado)
    console.log(hint ?? '(sin argumentos pendientes)')
    return 0
  }

  if (orden === 'skills-path') {
    const fuente = rest[0]
    const dir = rest[1]
    if (!fuente || !(FUENTES_SKILLS_PATH as readonly string[]).includes(fuente)) {
      guard(`fuente inválida: «${fuente ?? ''}». Use ${FUENTES_SKILLS_PATH.join(' | ')}`)
    }
    if (dir !== 'skills' && dir !== 'commands') {
      guard(`dir inválido: «${dir ?? ''}». Use skills | commands`)
    }
    console.log(getSkillsPath(fuente as SettingSource | 'plugin', dir))
    return 0
  }

  if (orden === 'managed-path') {
    console.log(`archivo base   ${getManagedFilePath()}`)
    console.log(`drop-in dir    ${getManagedSettingsDropInDir()}`)
    return 0
  }

  if (orden === 'estimate-tokens') {
    const skill = {
      name: opcion(rest, '--name', ''),
      description: opcion(rest, '--description', ''),
      whenToUse: opcionPresente(rest, '--when-to-use') ? opcion(rest, '--when-to-use', '') : undefined,
    }
    console.log(String(estimateSkillFrontmatterTokens(skill)))
    return 0
  }

  if (orden === 'command-info') {
    const nombre = opcion(rest, '--name', '')
    if (!nombre) guard('falta --name')
    const cmd: CommandBase = { name: nombre, description: '' }
    if (opcionPresente(rest, '--user-facing-name')) {
      const visible = opcion(rest, '--user-facing-name', '')
      cmd.userFacingName = () => visible
    }
    if (opcionPresente(rest, '--enabled')) {
      const valor = opcion(rest, '--enabled', '')
      if (valor !== 'true' && valor !== 'false') guard(`--enabled inválido: «${valor}». Use true | false`)
      cmd.isEnabled = () => valor === 'true'
    }
    console.log(`nombre:      ${getCommandName(cmd)}`)
    console.log(`habilitado:  ${isCommandEnabled(cmd)}`)
    return 0
  }

  if (orden === 'gitignore-path') {
    console.log(getGlobalGitignorePath())
    return 0
  }

  if (orden === 'moved-message') {
    const pluginName = opcion(rest, '--plugin-name', '')
    const pluginCommand = opcion(rest, '--plugin-command', '')
    if (!pluginName) guard('falta --plugin-name')
    if (!pluginCommand) guard('falta --plugin-command')
    const args = opcion(rest, '--args', '')
    const esAnt = opcionPresente(rest, '--ant')
    const previoUserType = process.env.USER_TYPE
    if (esAnt) process.env.USER_TYPE = 'ant'
    else delete process.env.USER_TYPE
    const cmd = createMovedToPluginCommand({
      name: pluginCommand,
      description: '',
      progressMessage: '',
      pluginName,
      pluginCommand,
      getPromptWhileMarketplaceIsPrivate: async () => [
        { type: 'text', text: '(delegado — marketplace ya público: sin mensaje de instalación)' },
      ],
    })
    if (cmd.type !== 'prompt' || !cmd.getPromptForCommand) {
      guard('createMovedToPluginCommand no devolvió un prompt command (no debería pasar)')
    }
    // USER_TYPE se lee DENTRO de getPromptForCommand — restaurar antes de
    // llamarlo deshace el --ant que acabamos de fijar (bug propio, atrapado
    // por el test "instrucciones de instalación" antes de cablearse).
    const bloques = await cmd.getPromptForCommand(args, {})
    if (previoUserType === undefined) delete process.env.USER_TYPE
    else process.env.USER_TYPE = previoUserType
    for (const b of bloques) {
      if ('text' in b) console.log(b.text)
    }
    return 0
  }

  if (orden === 'fork-slug') {
    const directiva = rest.join(' ')
    console.log(deriveForkSlug(directiva))
    return 0
  }

  if (orden === 'ultrareview-enabled') {
    console.log(String(isUltrareviewEnabled()))
    console.log('(false por construcción en este árbol: no hay cliente GrowthBook — ver commands/review/featureFlags.ts)')
    return 0
  }

  if (orden === 'plugin-args') {
    const args = rest.join(' ')
    console.log(JSON.stringify(parsePluginArgs(args || undefined)))
    return 0
  }

  if (orden === 'exec-shell') {
    const shellRaw = opcion(rest, '--shell', '')
    if (shellRaw && shellRaw !== 'bash' && shellRaw !== 'powershell') {
      guard(`--shell inválido: «${shellRaw}». Use bash | powershell`)
    }
    const shell = shellRaw === 'powershell' ? 'powershell' as const : shellRaw === 'bash' ? 'bash' as const : undefined
    const texto = await leerEntrada(rest, '--file')
    try {
      const resultado = await executeShellCommandsInPrompt(texto, {}, 'command.ts', shell)
      console.log(resultado)
      return 0
    } catch (e) {
      console.error(`DIVERGENCIA ESPERADA (DEC-04) — ${(e as Error).message}`)
      console.error('El mecanismo llegó hasta el intento de ejecutar: BashTool/PowerShellTool no están portados en este árbol.')
      return EXIT_DIVERGENCIA
    }
  }

  if (orden === 'xml') {
    const sub = rest[0]
    if (sub === 'tags') {
      const entradas = Object.entries(xmlTags as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'string')
        .sort(([a], [b]) => a.localeCompare(b))
      for (const [k, v] of entradas) console.log(`${k.padEnd(28)} ${v}`)
      return 0
    }
    if (sub === 'skill-loading') {
      const nombre = rest[1]
      if (!nombre) guard('falta el nombre del skill. Ejemplo: xml skill-loading mi-skill')
      console.log(formatSkillLoadingMetadata(nombre))
      return 0
    }
    guard(`xml: subcomando desconocido: «${sub ?? ''}». Use tags | skill-loading`)
  }

  if (orden === 'errors') {
    const sub = rest[0]
    if (sub === 'list') {
      console.log(`${'clave'.padEnd(15)} ${'clase'.padEnd(30)} code`)
      for (const [clave, Cls] of Object.entries(CLASES_ERROR)) {
        const e = new Cls('demo')
        console.log(`${clave.padEnd(15)} ${e.name.padEnd(30)} ${e.code}`)
      }
      console.log('(la base, CommandRuntimeBaseError, recibe su code del que la instancia — no tiene uno fijo)')
      return 0
    }
    if (sub === 'raise') {
      const clave = rest[1]
      if (!clave || !(clave in CLASES_ERROR)) {
        guard(`clase desconocida: «${clave ?? ''}». Use ${Object.keys(CLASES_ERROR).join(' | ')}`)
      }
      const mensaje = rest.slice(2).join(' ') || 'demo'
      try {
        throw new CLASES_ERROR[clave as ClaveError](mensaje)
      } catch (e) {
        const err = e as InstanceType<typeof CLASES_ERROR[ClaveError]>
        console.log(`${err.name}  code=${err.code}  instanceof CommandRuntimeBaseError=${err instanceof CommandRuntimeBaseError}`)
        console.log(`mensaje: ${err.message}`)
      }
      return 0
    }
    guard(`errors: subcomando desconocido: «${sub ?? ''}». Use list | raise`)
  }

  // Inalcanzable: SUBCOMANDOS ya se validó arriba.
  guard(`subcomando sin manejar: «${orden}»`)
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e) => {
    console.error(`command: error no capturado — ${(e as Error).message}`)
    process.exit(EXIT_DIVERGENCIA)
  },
)

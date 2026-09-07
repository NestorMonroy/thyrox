/**
 * `bin/command.ts` (tarea #223) — la puerta a los 14 módulos de producto de
 * `command-runtime`, probada por `spawn`: cada subcomando se ejercita como lo
 * ejercitaría un turno real, contra el binario `bun run` y no contra un mock
 * de sus funciones (esas ya tienen su propia suite, junto a cada módulo).
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BIN = join(import.meta.dir, '..', '..', 'bin', 'command.ts')

function run(args: string[], opts: { stdin?: string; env?: Record<string, string> } = {}) {
  return Bun.spawnSync(
    ['bun', 'run', BIN, ...args],
    {
      stdin: opts.stdin !== undefined ? Buffer.from(opts.stdin) : undefined,
      env: { ...process.env, ...opts.env },
    },
  )
}

describe('sin subcomando / ayuda', () => {
  test('sin argumentos: imprime el uso y sale 2 (nunca una lectura por defecto)', () => {
    const p = run([])
    expect(p.exitCode).toBe(2)
    expect(p.stdout.toString()).toContain('uso: bun run bin/command.ts')
  })

  test('--help sin subcomando: imprime el uso y sale 0', () => {
    const p = run(['--help'])
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString()).toContain('subcomandos')
  })

  test('subcomando desconocido: sale 2 y nombra los válidos', () => {
    const p = run(['no-existe'])
    expect(p.exitCode).toBe(2)
    expect(p.stderr.toString()).toContain('subcomando desconocido')
    expect(p.stderr.toString()).toContain('parse-slash')
  })
})

describe('parse-slash', () => {
  test('un slash command simple → JSON con commandName/args/isMcp', () => {
    const p = run(['parse-slash', '/deploy prod --force', '--json'])
    expect(p.exitCode).toBe(0)
    expect(JSON.parse(p.stdout.toString())).toEqual({
      commandName: 'deploy', args: 'prod --force', isMcp: false,
    })
  })

  test('un comando MCP marca isMcp y conserva "(MCP)" en el nombre', () => {
    const p = run(['parse-slash', '/mcp:tool (MCP) arg1 arg2', '--json'])
    const r = JSON.parse(p.stdout.toString())
    expect(r.isMcp).toBe(true)
    expect(r.commandName).toBe('mcp:tool (MCP)')
  })

  test('--stacked junta 2 a 5 /comandos iniciales', () => {
    const p = run(['parse-slash', '/skill1 /skill2 haz la tarea', '--stacked', '--json'])
    expect(JSON.parse(p.stdout.toString())).toEqual({
      commandNames: ['skill1', 'skill2'], args: 'haz la tarea',
    })
  })

  test('sin entrada: sale 2 sin veredicto', () => {
    const p = run(['parse-slash'])
    expect(p.exitCode).toBe(2)
    expect(p.stderr.toString()).toContain('falta la entrada')
  })

  test('entrada que no empieza con "/": no parsea → sale 2', () => {
    const p = run(['parse-slash', 'esto no es un slash command'])
    expect(p.exitCode).toBe(2)
    expect(p.stderr.toString()).toContain('no parsea')
  })
})

describe('substitute', () => {
  test('sustituye $ARGUMENTS, $ARGUMENTS[n] y un argumento nombrado', () => {
    const p = run(['substitute', '--args', 'hello world', '--names', 'foo'], {
      stdin: '$ARGUMENTS / $ARGUMENTS[1] / $foo',
    })
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString().trim()).toBe('hello world / world / hello')
  })

  test('sin --args (undefined): el contenido no cambia', () => {
    const p = run(['substitute'], { stdin: 'plantilla $ARGUMENTS sin tocar' })
    expect(p.stdout.toString().trim()).toBe('plantilla $ARGUMENTS sin tocar')
  })

  test('--no-append no agrega "ARGUMENTS:" cuando no hay placeholder', () => {
    const p = run(['substitute', '--args', 'x', '--no-append'], { stdin: 'sin placeholders' })
    expect(p.stdout.toString().trim()).toBe('sin placeholders')
  })
})

describe('argument-hint', () => {
  test('nombres pendientes tras los ya tecleados', () => {
    const p = run(['argument-hint', '--names', 'a b c', '--typed', 'a b'])
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString().trim()).toBe('[c]')
  })

  test('todos tecleados → "(sin argumentos pendientes)"', () => {
    const p = run(['argument-hint', '--names', 'a b', '--typed', 'a b'])
    expect(p.stdout.toString().trim()).toBe('(sin argumentos pendientes)')
  })

  test('sin --names: sale 2', () => {
    const p = run(['argument-hint'])
    expect(p.exitCode).toBe(2)
    expect(p.stderr.toString()).toContain('--names')
  })
})

describe('skills-path', () => {
  test('userSettings + skills → ~/.claude/skills (con CLAUDE_CONFIG_DIR fijado)', () => {
    const p = run(['skills-path', 'userSettings', 'skills'], { env: { CLAUDE_CONFIG_DIR: '/home/user/.claude' } })
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString().trim()).toBe('/home/user/.claude/skills')
  })

  test('userSettings SIN CLAUDE_CONFIG_DIR declarado — el caso real del entorno', () => {
    // Control positivo de H-COMMAND-RUNTIME-01: sin la variable, `key` es
    // `undefined` en la PRIMERA llamada — exactamente la rama que el
    // centinela SIN_CACHE tenía que cubrir.
    const env = { ...process.env }
    delete (env as Record<string, string | undefined>).CLAUDE_CONFIG_DIR
    const p = Bun.spawnSync(['bun', 'run', BIN, 'skills-path', 'userSettings', 'skills'], { env })
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString().trim()).toContain('.claude/skills')
  })

  test('projectSettings + commands → ruta relativa', () => {
    const p = run(['skills-path', 'projectSettings', 'commands'])
    expect(p.stdout.toString().trim()).toBe('.claude/commands')
  })

  test('plugin → centinela "plugin"', () => {
    const p = run(['skills-path', 'plugin', 'skills'])
    expect(p.stdout.toString().trim()).toBe('plugin')
  })

  test('fuente inválida: sale 2 nombrando las válidas', () => {
    const p = run(['skills-path', 'noexiste', 'skills'])
    expect(p.exitCode).toBe(2)
    expect(p.stderr.toString()).toContain('userSettings')
  })

  test('dir inválido: sale 2', () => {
    const p = run(['skills-path', 'userSettings', 'noexiste'])
    expect(p.exitCode).toBe(2)
    expect(p.stderr.toString()).toContain('skills | commands')
  })
})

describe('managed-path', () => {
  test('imprime el archivo base y el drop-in dir', () => {
    const p = run(['managed-path'])
    expect(p.exitCode).toBe(0)
    const out = p.stdout.toString()
    expect(out).toContain('managed-settings.d')
  })
})

describe('estimate-tokens', () => {
  test('name + description + whenToUse combinados → 5 (el ejemplo de skillHelpers.test.ts)', () => {
    const p = run(['estimate-tokens', '--name', 'name', '--description', 'description', '--when-to-use', 'when'])
    expect(p.stdout.toString().trim()).toBe('5')
  })

  test('todo vacío → 0', () => {
    const p = run(['estimate-tokens'])
    expect(p.stdout.toString().trim()).toBe('0')
  })
})

describe('command-info', () => {
  test('sin --user-facing-name: usa .name; sin --enabled: habilitado por defecto', () => {
    const p = run(['command-info', '--name', 'plain-name'])
    const out = p.stdout.toString()
    expect(out).toContain('nombre:      plain-name')
    expect(out).toContain('habilitado:  true')
  })

  test('--user-facing-name gana sobre --name; --enabled false se respeta', () => {
    const p = run(['command-info', '--name', 'plain', '--user-facing-name', 'fancy', '--enabled', 'false'])
    const out = p.stdout.toString()
    expect(out).toContain('nombre:      fancy')
    expect(out).toContain('habilitado:  false')
  })

  test('sin --name: sale 2', () => {
    const p = run(['command-info'])
    expect(p.exitCode).toBe(2)
  })

  test('--enabled con valor inválido: sale 2', () => {
    const p = run(['command-info', '--name', 'x', '--enabled', 'quizas'])
    expect(p.exitCode).toBe(2)
    expect(p.stderr.toString()).toContain('true | false')
  })
})

describe('gitignore-path', () => {
  test('apunta a .config/git/ignore', () => {
    const p = run(['gitignore-path'])
    expect(p.exitCode).toBe(0)
    const out = p.stdout.toString().trim()
    expect(out).toContain('.config')
    expect(out).toContain('git')
    expect(out.endsWith('ignore')).toBe(true)
  })
})

describe('moved-message', () => {
  test('--ant: instrucciones de instalación con el plugin/comando interpolados', () => {
    const p = run(['moved-message', '--plugin-name', 'my-plugin', '--plugin-command', 'foo', '--ant'])
    const out = p.stdout.toString()
    expect(out).toContain('moved to a plugin')
    expect(out).toContain('claude plugin install my-plugin@claude-code-how-works-marketplace')
    expect(out).toContain('/my-plugin:foo')
  })

  test('sin --ant: delega (texto del fallback, no las instrucciones de instalación)', () => {
    const p = run(['moved-message', '--plugin-name', 'my-plugin', '--plugin-command', 'foo'], { env: { USER_TYPE: '' } })
    const out = p.stdout.toString()
    expect(out).not.toContain('moved to a plugin')
    expect(out).toContain('delegado')
  })

  test('sin --plugin-name: sale 2', () => {
    const p = run(['moved-message', '--plugin-command', 'foo'])
    expect(p.exitCode).toBe(2)
  })
})

describe('fork-slug', () => {
  test('toma las 3 primeras palabras, en minúsculas y en kebab', () => {
    const p = run(['fork-slug', 'Fix the login bug ASAP'])
    expect(p.stdout.toString().trim()).toBe('fix-the-login')
  })

  test('directiva vacía → "fork"', () => {
    const p = run(['fork-slug'])
    expect(p.stdout.toString().trim()).toBe('fork')
  })
})

describe('ultrareview-enabled', () => {
  test('false por construcción (sin cliente GrowthBook en este árbol)', () => {
    const p = run(['ultrareview-enabled'])
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString()).toContain('false')
  })
})

describe('plugin-args', () => {
  test('install plugin@marketplace se separa en sus dos partes', () => {
    const p = run(['plugin-args', 'install', 'my-plugin@marketplace'])
    expect(JSON.parse(p.stdout.toString())).toEqual({
      type: 'install', plugin: 'my-plugin', marketplace: 'marketplace',
    })
  })

  test('sin args → menu', () => {
    const p = run(['plugin-args'])
    expect(JSON.parse(p.stdout.toString())).toEqual({ type: 'menu' })
  })
})

describe('exec-shell', () => {
  test('texto sin directivas de shell: pasa sin cambios', () => {
    const p = run(['exec-shell'], { stdin: 'texto plano, nada que ejecutar' })
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString().trim()).toBe('texto plano, nada que ejecutar')
  })

  test('con una directiva !`...`: el mecanismo llega hasta el intento de ejecutar y ahí se detiene (DEC-04)', () => {
    const p = run(['exec-shell'], { stdin: 'texto !`echo hola`' })
    expect(p.exitCode).toBe(1)
    expect(p.stderr.toString()).toContain('DEC-04')
    expect(p.stderr.toString()).toContain('BashTool')
  })

  test('--shell inválido: sale 2 (precondición, no divergencia)', () => {
    const p = run(['exec-shell', '--shell', 'zsh'], { stdin: 'x' })
    expect(p.exitCode).toBe(2)
  })
})

describe('xml', () => {
  test('tags lista las constantes conocidas', () => {
    const p = run(['xml', 'tags'])
    const out = p.stdout.toString()
    expect(out).toContain('COMMAND_NAME_TAG')
    expect(out).toContain('command-name')
    expect(out).toContain('TEAMMATE_MESSAGE_TAG')
  })

  test('skill-loading arma el bloque de metadata de un skill', () => {
    const p = run(['xml', 'skill-loading', 'mi-skill'])
    const out = p.stdout.toString()
    expect(out).toContain('<command-message>mi-skill</command-message>')
    expect(out).toContain('<command-name>mi-skill</command-name>')
    expect(out).toContain('<skill-format>true</skill-format>')
  })

  test('skill-loading sin nombre: sale 2', () => {
    const p = run(['xml', 'skill-loading'])
    expect(p.exitCode).toBe(2)
  })

  test('subcomando de xml desconocido: sale 2', () => {
    const p = run(['xml', 'no-existe'])
    expect(p.exitCode).toBe(2)
  })
})

describe('errors', () => {
  test('list muestra las 4 subclases con su code prefijado', () => {
    const p = run(['errors', 'list'])
    const out = p.stdout.toString()
    expect(out).toContain('COMMAND_RUNTIME_NOT_FOUND')
    expect(out).toContain('COMMAND_RUNTIME_RESOLUTION_ERROR')
    expect(out).toContain('COMMAND_RUNTIME_EXECUTION_ERROR')
    expect(out).toContain('COMMAND_RUNTIME_HOST_BINDINGS_ERROR')
  })

  test('raise construye, lanza y reporta la clase pedida', () => {
    const p = run(['errors', 'raise', 'not-found', 'no existe el comando'])
    expect(p.exitCode).toBe(0)
    const out = p.stdout.toString()
    expect(out).toContain('CommandRuntimeNotFoundError')
    expect(out).toContain('code=COMMAND_RUNTIME_NOT_FOUND')
    expect(out).toContain('no existe el comando')
  })

  test('clase desconocida: sale 2', () => {
    const p = run(['errors', 'raise', 'no-existe'])
    expect(p.exitCode).toBe(2)
  })
})

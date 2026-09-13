/**
 * `src/entry/main.ts` (T-009) — un ciclo completo de punta a punta.
 *
 * Fuente: diseño nativo — el punto de entrada del harness. El test lo corre por
 * `spawn` con el proveedor grabado, midiendo el ciclo real y no una simulación
 * de sus partes.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startAnthropicMockServer } from '@thyrox/provider/anthropicMockServer'

const BIN = join(import.meta.dir, '..', 'src', 'entry', 'main.ts')
const uso = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

describe('src/entry/main.ts (T-009) — un ciclo completo de punta a punta', () => {
  test('con turnos grabados ejecuta una herramienta real y devuelve el texto', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const marca = join(d, 'lo-hizo.txt')
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Write', input: { file_path: marca, content: 'hecho' } }] },
      { id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
        content: [{ type: 'text', text: 'archivo escrito' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'escribe el archivo', '--provider', 'recorded',
      '--grabacion', join(d, 'turnos.json'), '--cwd', d, '--transcript-dir', join(d, 'tr'), '--json'])
    expect(p.exitCode).toBe(0)
    const r = JSON.parse(p.stdout.toString())
    expect(r.stop).toBe('end_turn')
    expect(r.turns).toBe(2)
    expect(r.lastText).toBe('archivo escrito')
    expect(Bun.file(marca).size).toBeGreaterThan(0)
  })

  test('sin --prompt imprime la ayuda y sale 2', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN])
    expect(p.exitCode).toBe(2)
    expect(p.stdout.toString()).toContain('--prompt')
  })

  test('--provider http sin credencial falla diciendo por que, no en silencio', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--provider', 'http'],
      { env: { ...process.env, ANTHROPIC_API_KEY: '' } })
    expect(p.exitCode).not.toBe(0)
    expect(p.stderr.toString()).toContain('ANTHROPIC_API_KEY')
  })
})

describe('la CLI dibuja el flujo de eventos (T-038, T-040)', () => {
  const turnos = (d: string) => {
    const p = join(d, 'turnos.json')
    writeFileSync(p, JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'echo hola' } }] },
      { id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
        content: [{ type: 'text', text: 'terminado' }] },
    ]))
    return p
  }

  test('--output-style text anuncia cada herramienta mientras corre', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'text'])
    const salida = p.stdout.toString()
    expect(salida).toContain('Bash')
    expect(salida).toContain('echo hola')
    expect(salida).toContain('terminado')
  })

  test('--output-style quiet imprime la respuesta y calla el resto', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'quiet'])
    const salida = p.stdout.toString()
    expect(salida).toContain('terminado')
    expect(salida).not.toContain('echo hola')
  })

  test('--output-style json emite una linea JSON valida por evento', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'json'])
    const lineas = p.stdout.toString().trim().split('\n').map((l) => JSON.parse(l))
    expect(lineas[0].type).toBe('session_start')
    expect(lineas.at(-1).type).toBe('done')
  })

  test('un estilo inexistente se rechaza nombrando los validos', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'arcoiris'])
    expect(p.exitCode).toBe(2)
    expect(p.stderr.toString()).toContain('quiet')
  })

  test('--sessions lista lo que hay para reanudar, y sale sin correr el bucle', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const tr = join(d, 'tr')
    Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'la pregunta original', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', tr, '--output-style', 'quiet'])
    const p = Bun.spawnSync(['bun', 'run', BIN, '--sessions', '--transcript-dir', tr])
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString()).toContain('la pregunta original')
    expect(p.stdout.toString()).toContain('claude-opus-5')
  })
})

describe('la CLI lee la configuracion del proyecto (T-044)', () => {
  test('--settings-source project toma hooks y permisos de .claude/settings.json', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const marca = join(d, 'el-hook-corrio.txt')
    require('node:fs').mkdirSync(join(d, '.claude'), { recursive: true })
    writeFileSync(join(d, '.claude', 'settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: `cat > ${JSON.stringify(marca)}; echo '{}'` }] }] },
    }))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'ya' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--settings-source', 'project', '--output-style', 'quiet'])
    expect(p.exitCode).toBe(0)
    expect(Bun.file(marca).size).toBeGreaterThan(0)
  })
})

describe('modo conversacion (T-039)', () => {
  test('cada linea de stdin es un turno, y el segundo VE el primero', () => {
    const d = mkdtempSync(join(tmpdir(), 'chat-'))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'hola a ti' }] },
      { id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'te dije hola a ti' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--chat', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'quiet'],
      { stdin: Buffer.from('hola\nque me dijiste\n') })
    expect(p.exitCode).toBe(0)
    const salida = p.stdout.toString()
    expect(salida).toContain('hola a ti')
    expect(salida).toContain('te dije hola a ti')
    // una sola sesion: el segundo prompt reanuda la primera
    const sesiones = require('node:fs').readdirSync(join(d, 'tr'))
    expect(sesiones.length).toBe(1)
  })

  test('la linea de salida termina la conversacion sin error', () => {
    const d = mkdtempSync(join(tmpdir(), 'chat-'))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'ok' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--chat', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'quiet'],
      { stdin: Buffer.from('uno\n/salir\ndos\n') })
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString()).toContain('ok')
  })

  test('una linea vacia no gasta un turno', () => {
    const d = mkdtempSync(join(tmpdir(), 'chat-'))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'unico' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--chat', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'quiet'],
      { stdin: Buffer.from('\n   \nuno\n') })
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString().trim()).toBe('unico')
  })
})

describe('la configuracion viene de @thyrox/config (T-044)', () => {
  test('project y local se ACUMULAN en hooks, con la precedencia del paquete', () => {
    const d = mkdtempSync(join(tmpdir(), 'cfg-'))
    const a = join(d, 'de-project.txt')
    const b = join(d, 'de-local.txt')
    require('node:fs').mkdirSync(join(d, '.claude'), { recursive: true })
    writeFileSync(join(d, '.claude', 'settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: `cat > ${JSON.stringify(a)}; echo '{}'` }] }] },
    }))
    writeFileSync(join(d, '.claude', 'settings.local.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: `cat > ${JSON.stringify(b)}; echo '{}'` }] }] },
    }))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'ya' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--settings-source', 'project', '--output-style', 'quiet'])
    expect(p.exitCode).toBe(0)
    expect(Bun.file(a).size).toBeGreaterThan(0)
    expect(Bun.file(b).size).toBeGreaterThan(0)
  })

  test('un settings.json invalido AVISA con su ruta y el arranque sigue', () => {
    const d = mkdtempSync(join(tmpdir(), 'cfg-'))
    require('node:fs').mkdirSync(join(d, '.claude'), { recursive: true })
    writeFileSync(join(d, '.claude', 'settings.json'), '{esto no es json')
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'ya' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--settings-source', 'project', '--output-style', 'quiet'])
    expect(p.exitCode).toBe(0)
    expect(p.stderr.toString()).toContain('settings.json')
  })

  test('--config-origin dice de que fuente salio cada clave', () => {
    const d = mkdtempSync(join(tmpdir(), 'cfg-'))
    require('node:fs').mkdirSync(join(d, '.claude'), { recursive: true })
    writeFileSync(join(d, '.claude', 'settings.json'), JSON.stringify({ model: 'claude-opus-5' }))
    writeFileSync(join(d, '.claude', 'settings.local.json'), JSON.stringify({ model: 'claude-sonnet-5' }))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--config-origin', '--cwd', d, '--settings-source', 'project'])
    expect(p.exitCode).toBe(0)
    const salida = p.stdout.toString()
    expect(salida).toContain('model')
    expect(salida).toContain('localSettings')
  })
})

describe('--connection activa @thyrox/config de verdad y decide compressToolResults (T-9)', () => {
  // Misma salida de `git status` que `contextCompressionWiring.test.ts` ya usa
  // para probar el filtro RTK -- aqui se ejercita a traves del BINARIO real
  // (proceso spawneado), no de una llamada directa a `runLoop`. El heredoc con
  // delimitador entre comillas hace que bash la emita verbatim.
  const GIT_STATUS_OUTPUT =
    'On branch main\n' +
    'Changes not staged for commit:\n' +
    '  (use "git add <file>..." to update what will be committed)\n' +
    '  (use "git restore <file>..." to discard changes in working directory)\n' +
    '\tmodified:   a.ts\n' +
    '\n' +
    'no changes added to commit\n'
  const BASH_COMMAND = `cat <<'GITSTATUSEOF'\n${GIT_STATUS_OUTPUT}GITSTATUSEOF`

  const turnosGitStatus = (d: string) => {
    const p = join(d, 'turnos.json')
    writeFileSync(p, JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: BASH_COMMAND } }] },
      { id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
        content: [{ type: 'text', text: 'listo' }] },
    ]))
    return p
  }

  // La conexion se persiste como `@thyrox/config` la escribe de verdad --
  // misma forma medida en `outputs/home/.claude/.claude.json` del banco
  // `correr-connectionToolCompression-de-verdad-20260913T064445` -- para que
  // el binario la lea por su via real (`getConnection` -> `getGlobalConfig`),
  // no por un objeto que el test le pase a mano.
  const conConHome = (compressToolResults: boolean | undefined) => {
    const home = mkdtempSync(join(tmpdir(), 'con-home-'))
    require('node:fs').mkdirSync(join(home, '.claude'), { recursive: true })
    writeFileSync(join(home, '.claude', '.claude.json'), JSON.stringify({
      connections: [{
        id: 'con-1', name: 'con-1', protocol: 'anthropic', endpoint: 'http://127.0.0.1:0',
        auth: { type: 'api_key', key: 'sk-test' }, enabled: true, models: [], createdAt: 1,
        ...(compressToolResults === undefined ? {} : { providerSpecificData: { compressToolResults } }),
      }],
    }))
    return home
  }

  function correr(d: string, home: string, connectionId?: string) {
    const args = ['bun', 'run', BIN, '--prompt', 'corre git status', '--grabacion', turnosGitStatus(d),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'json']
    if (connectionId) args.push('--connection', connectionId)
    // `NODE_ENV` se hereda de ESTE proceso (`bun test` lo fija a `test`), y
    // `getGlobalConfig`/`saveGlobalConfig` (`config.ts:794,835,626`) desvian a
    // un objeto fijo en memoria y saltan el guard de activacion bajo ese
    // valor -- documentado ahi como la via de la fuente para probarse SIN
    // tocar disco. Este test mide lo contrario: que `--connection` lea la
    // conexion real, persistida, del `.claude.json` en `home`. Quitar
    // `NODE_ENV` reproduce el entorno de un usuario real (que nunca corre con
    // `NODE_ENV=test`), sin lo cual las tres pruebas de este bloque pasarian
    // igual leyendo el stub -- un verde que no discrimina.
    const env = { ...process.env, HOME: home }
    delete env.NODE_ENV
    const p = Bun.spawnSync(args, { env })
    expect(p.exitCode).toBe(0)
    const eventos = p.stdout.toString().trim().split('\n').map((l) => JSON.parse(l))
    const toolEnd = eventos.find((e) => e.type === 'tool_end')
    return toolEnd.output as string
  }

  test('sin --connection: el ruido de git status llega intacto (default apagado)', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-con-'))
    const home = conConHome(true)
    const salida = correr(d, home)
    expect(salida).toContain('(use "git add')
  })

  test('--connection SIN compressToolResults en su providerSpecificData: sigue intacto', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-con-'))
    const home = conConHome(undefined)
    const salida = correr(d, home, 'con-1')
    expect(salida).toContain('(use "git add')
  })

  test('--connection CON compressToolResults:true en su providerSpecificData (persistida via @thyrox/config): RTK recorta el ruido', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-con-'))
    const home = conConHome(true)
    const salida = correr(d, home, 'con-1')
    expect(salida).not.toContain('(use "git add')
    expect(salida).toContain('modified:   a.ts')
  })
})

describe('--connection dirige el ENDPOINT y la AUTH del transporte http real (T-10)', () => {
  test('con --provider http, endpoint y auth de la conexion, el binario le pega al servidor local -- no a la API real', async () => {
    const servidor = await startAnthropicMockServer({
      host: '127.0.0.1', port: 0,
      respond: () => ({ content: [{ type: 'text', text: 'hola desde el servidor local' }] }),
    })
    try {
      const home = mkdtempSync(join(tmpdir(), 'con-endpoint-'))
      require('node:fs').mkdirSync(join(home, '.claude'), { recursive: true })
      writeFileSync(join(home, '.claude', '.claude.json'), JSON.stringify({
        connections: [{
          id: 'con-local', name: 'con-local', protocol: 'anthropic', endpoint: servidor.url,
          auth: { type: 'api_key', key: 'sk-local-mock' }, enabled: true, models: [], createdAt: 1,
        }],
      }))
      const d = mkdtempSync(join(tmpdir(), 'bin-endpoint-'))
      const env: Record<string, string | undefined> = { ...process.env, HOME: home }
      delete env.ANTHROPIC_API_KEY
      delete env.ANTHROPIC_BASE_URL
      delete env.NODE_ENV   // ver correr() de arriba: bun test lo fija, y desviaria a getGlobalConfig() de sus datos reales
      // `Bun.spawnSync` bloquea el event loop del proceso PADRE hasta que el
      // hijo termina -- y el servidor mock, que corre en ESE mismo hilo, no
      // podria atender la peticion del hijo mientras el padre esta bloqueado
      // esperandolo: un auto-interbloqueo. Medido: con `spawnSync` el test
      // colgaba 5 s y el servidor no veia NINGUNA peticion; con `Bun.spawn`
      // (asincrono) + `await p.exited`, el event loop sigue libre para que el
      // servidor responda mientras el padre espera.
      const p = Bun.spawn(['bun', 'run', BIN, '--prompt', 'hola', '--provider', 'http',
        '--connection', 'con-local', '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'json'],
        { env, stdout: 'pipe', stderr: 'pipe' })
      const exitCode = await p.exited
      const salidaEstandar = await new Response(p.stdout).text()

      expect(exitCode).toBe(0)
      const eventos = salidaEstandar.trim().split('\n').map((l) => JSON.parse(l))
      const texto = eventos.find((e) => e.type === 'text')
      expect(texto?.text).toBe('hola desde el servidor local')

      // La prueba afirmativa: el servidor LOCAL, no el real, recibio la peticion.
      expect(servidor.requests.length).toBe(1)
      expect(servidor.requests[0]!.path).toBe('/v1/messages')
      expect(servidor.requests[0]!.headers['x-api-key']).toBe('sk-local-mock')
      expect((servidor.requests[0]!.body as { model: string }).model).toBe('claude-opus-5')
    } finally {
      await servidor.close()
    }
  })

  test('sin --connection, --provider http sin credencial sigue fallando igual que antes (T-10 no cambia el default)', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--provider', 'http'],
      { env: { ...process.env, ANTHROPIC_API_KEY: '' } })
    expect(p.exitCode).not.toBe(0)
    expect(p.stderr.toString()).toContain('ANTHROPIC_API_KEY')
  })
})

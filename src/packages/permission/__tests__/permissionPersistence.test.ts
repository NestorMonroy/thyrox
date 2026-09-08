/**
 * La mitad ROJA del tramo de PERSISTENCIA de permisos.
 *
 * Procedencia: `ccnmt: packages/permission/src/{PermissionUpdate.ts,
 * PermissionPromptToolResultSchema.ts}`. Ese árbol declara `"license":
 * "UNLICENSED"`, así que los cuerpos se reimplementan y no se copian.
 *
 * POR QUÉ AHORA. `PermissionUpdate.ts` porta 6 de sus 8 símbolos y declara los
 * dos que faltan —`persistPermissionUpdate` y `persistPermissionUpdates`— con
 * este bloqueo: *«llaman `getSettingsForSource`/`updateSettingsForSource` de
 * config … sin `@thyrox/config` linkeado en `node_modules` de este paquete»*.
 * Medido hoy: `@thyrox/config` SÍ está enlazado, y las dos funciones existen
 * en `config/settings/settings.ts`. Es el décimo bloqueo declarado que resulta
 * caducado; el aviso se retira en vez de dejarlo pudrirse.
 *
 * `PermissionPromptToolResultSchema.ts` es su consumidor directo —normaliza la
 * respuesta de un anfitrión SDK y persiste lo que traiga— y su otro bloqueo,
 * zod, cayó al cerrar la capa de esquemas.
 *
 * Métrica: qué queda escrito en el archivo de settings tras cada forma de
 * actualización, y cómo se normaliza una decisión que llega de fuera.
 * Ciega a: la concurrencia entre dos escritores del mismo archivo — eso es del
 * mecanismo de settings, no de este módulo.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

// `/dev/shm` y no el directorio temporal del sistema: la directiva de este
// árbol prohíbe `/tmp`, y aquí hace falta un filesystem real porque el
// mecanismo bajo prueba ESCRIBE.
const raiz = mkdtempSync('/dev/shm/perm-persist-')
afterAll(() => rmSync(raiz, { recursive: true, force: true }))

/** El archivo que `localSettings` resuelve bajo la raíz inyectada. */
function rutaLocal(): string {
  return join(raiz, '.claude', 'settings.local.json')
}

function leerLocal(): Record<string, unknown> {
  return JSON.parse(readFileSync(rutaLocal(), 'utf8')) as Record<string, unknown>
}

function escribirLocal(contenido: unknown): void {
  mkdirSync(dirname(rutaLocal()), { recursive: true })
  writeFileSync(rutaLocal(), JSON.stringify(contenido), 'utf8')
}

beforeEach(async () => {
  const { installConfigHostBindings } = await import('@thyrox/config/host.js')
  installConfigHostBindings({
    getOriginalCwd: () => raiz,
    getConfigHomeDir: () => join(raiz, '.claude'),
  })
  escribirLocal({})
})

describe('persistPermissionUpdate — sólo los destinos con archivo detrás', () => {
  test('1. un destino NO persistible no escribe nada', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    persistPermissionUpdate({
      type: 'addDirectories',
      directories: ['/x'],
      destination: 'session',
    })
    // `session` y `cliArg` viven mientras dure el proceso: escribirlos a disco
    // los convertiría en permanentes sin que nadie lo pidiera.
    expect(leerLocal()).toEqual({})
  })

  test('2. añadir directorios los escribe, y NO duplica los que ya están', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    escribirLocal({ permissions: { additionalDirectories: ['/ya'] } })
    persistPermissionUpdate({
      type: 'addDirectories',
      directories: ['/ya', '/nuevo'],
      destination: 'localSettings',
    })
    const p = leerLocal().permissions as { additionalDirectories: string[] }
    expect(p.additionalDirectories).toEqual(['/ya', '/nuevo'])
  })

  test('3. si TODOS los directorios ya estaban, no reescribe', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    escribirLocal({ permissions: { additionalDirectories: ['/ya'] }, marca: 1 })
    persistPermissionUpdate({
      type: 'addDirectories',
      directories: ['/ya'],
      destination: 'localSettings',
    })
    // La guarda de «nada que añadir» evita una escritura de disco que no
    // cambia nada — y con ella, invalidar cachés río abajo por gusto.
    expect(leerLocal().marca).toBe(1)
  })

  test('4. quitar directorios deja los que no se nombraron', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    escribirLocal({ permissions: { additionalDirectories: ['/a', '/b', '/c'] } })
    persistPermissionUpdate({
      type: 'removeDirectories',
      directories: ['/b'],
      destination: 'localSettings',
    })
    const p = leerLocal().permissions as { additionalDirectories: string[] }
    expect(p.additionalDirectories).toEqual(['/a', '/c'])
  })

  test('5. fijar el modo escribe el modo por defecto', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    persistPermissionUpdate({
      type: 'setMode',
      mode: 'acceptEdits',
      destination: 'localSettings',
    })
    expect((leerLocal().permissions as { defaultMode: string }).defaultMode).toBe(
      'acceptEdits',
    )
  })

  test('6. reemplazar reglas SUSTITUYE la lista entera de ese comportamiento', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    escribirLocal({ permissions: { allow: ['Bash(rm:*)', 'Read(//x)'] } })
    persistPermissionUpdate({
      type: 'replaceRules',
      rules: [{ toolName: 'Bash', ruleContent: 'git status:*' }],
      behavior: 'allow',
      destination: 'localSettings',
    })
    expect((leerLocal().permissions as { allow: string[] }).allow).toEqual([
      'Bash(git status:*)',
    ])
  })

  test('7. quitar reglas COMPARA NORMALIZADO, no por cadena cruda', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    // La regla guardada y la que se pide quitar pueden estar escritas distinto
    // y significar lo mismo. Comparar cadenas dejaría la regla viva y el
    // usuario creería haberla quitado.
    escribirLocal({ permissions: { deny: ['Bash(rm -rf:*)', 'Read(//otro)'] } })
    persistPermissionUpdate({
      type: 'removeRules',
      rules: [{ toolName: 'Bash', ruleContent: 'rm -rf:*' }],
      behavior: 'deny',
      destination: 'localSettings',
    })
    expect((leerLocal().permissions as { deny: string[] }).deny).toEqual([
      'Read(//otro)',
    ])
  })

  test('8. añadir reglas delega en el binding del anfitrión', async () => {
    const { installPermissionHostBindings } = await import('../src/host.ts')
    const llamadas: unknown[][] = []
    installPermissionHostBindings({
      addPermissionRulesToSettings: (...args: unknown[]) => {
        llamadas.push(args)
        return true
      },
    })
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    persistPermissionUpdate({
      type: 'addRules',
      rules: [{ toolName: 'Bash' }],
      behavior: 'allow',
      destination: 'userSettings',
    })
    expect(llamadas.length).toBe(1)
    expect(llamadas[0]![0]).toEqual({
      ruleValues: [{ toolName: 'Bash' }],
      ruleBehavior: 'allow',
    })
    expect(llamadas[0]![1]).toBe('userSettings')
  })

  test('9. sin ese binding instalado, añadir reglas LANZA', async () => {
    const { installPermissionHostBindings } = await import('../src/host.ts')
    installPermissionHostBindings({})
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    // Divergencia deliberada: un no-op silencioso aquí le diría al usuario que
    // su regla quedó guardada cuando no lo está. Es mejor romper ruidosamente
    // que mentir en silencio.
    //
    // La aserción exige el MENSAJE, no un lanzamiento cualquiera: con la mitad
    // roja el símbolo no existía, así que llamarlo lanzaba `TypeError` y el
    // caso pasaba en verde midiendo la ausencia del porte. Medido — era el
    // único de los veinte que pasaba antes de escribir nada.
    expect(() =>
      persistPermissionUpdate({
        type: 'addRules',
        rules: [{ toolName: 'Bash' }],
        behavior: 'allow',
        destination: 'localSettings',
      }),
    ).toThrow(/addPermissionRulesToSettings/)
  })
})

describe('persistPermissionUpdates — la lista entera, en orden', () => {
  test('10. aplica cada una, y salta las no persistibles', async () => {
    const { persistPermissionUpdates } = await import('../src/PermissionUpdate.ts')
    persistPermissionUpdates([
      { type: 'setMode', mode: 'plan', destination: 'localSettings' },
      { type: 'addDirectories', directories: ['/z'], destination: 'session' },
      {
        type: 'addDirectories',
        directories: ['/w'],
        destination: 'localSettings',
      },
    ])
    const p = leerLocal().permissions as {
      defaultMode: string
      additionalDirectories: string[]
    }
    expect(p.defaultMode).toBe('plan')
    expect(p.additionalDirectories).toEqual(['/w'])
  })
})

describe('inputSchema / outputSchema del resultado del anfitrión', () => {
  test('11. la entrada exige nombre y datos; el identificador es opcional', async () => {
    const { inputSchema } = await import('../src/PermissionPromptToolResultSchema.ts')
    expect(
      inputSchema().safeParse({ tool_name: 'Bash', input: { command: 'ls' } })
        .success,
    ).toBe(true)
    expect(inputSchema().safeParse({ input: {} }).success).toBe(false)
  })

  test('12. una decisión de permitir lleva su entrada actualizada', async () => {
    const { outputSchema } = await import('../src/PermissionPromptToolResultSchema.ts')
    const r = outputSchema().safeParse({
      behavior: 'allow',
      updatedInput: { command: 'ls -la' },
    })
    expect(r.success).toBe(true)
  })

  test('13. una decisión de denegar lleva mensaje, y sin él se rechaza', async () => {
    const { outputSchema } = await import('../src/PermissionPromptToolResultSchema.ts')
    expect(
      outputSchema().safeParse({ behavior: 'deny', message: 'no' }).success,
    ).toBe(true)
    expect(outputSchema().safeParse({ behavior: 'deny' }).success).toBe(false)
  })

  test('14. unos permisos MAL FORMADOS no tumban la decisión entera', async () => {
    const { outputSchema } = await import('../src/PermissionPromptToolResultSchema.ts')
    const r = outputSchema().safeParse({
      behavior: 'allow',
      updatedInput: {},
      updatedPermissions: [{ type: 'inventado' }],
    })
    // Un anfitrión SDK ajeno puede mandar basura en ese campo. Rechazar toda
    // la decisión por eso convertiría un permiso concedido en una denegación.
    expect(r.success).toBe(true)
    expect(r.success && r.data.updatedPermissions).toBe(undefined)
  })

  test('15. una clasificación desconocida cae a indefinida, no rechaza', async () => {
    const { outputSchema } = await import('../src/PermissionPromptToolResultSchema.ts')
    const r = outputSchema().safeParse({
      behavior: 'deny',
      message: 'no',
      decisionClassification: 'inventada',
    })
    expect(r.success).toBe(true)
    expect(r.success && r.data.decisionClassification).toBe(undefined)
  })
})

describe('permissionPromptToolResultToPermissionDecision', () => {
  function contexto(): {
    setAppState: (u: (prev: never) => unknown) => void
    abortController: { abort: () => void; abortado: boolean }
    estados: unknown[]
  } {
    const estados: unknown[] = []
    const abortController = {
      abortado: false,
      abort() {
        this.abortado = true
      },
    }
    return {
      estados,
      abortController,
      setAppState(u) {
        estados.push(u({ toolPermissionContext: { permissionRules: {} } } as never))
      },
    }
  }

  test('16. permitir con entrada VACÍA conserva la original', async () => {
    const { permissionPromptToolResultToPermissionDecision } = await import(
      '../src/PermissionPromptToolResultSchema.ts'
    )
    const ctx = contexto()
    const d = permissionPromptToolResultToPermissionDecision(
      { behavior: 'allow', updatedInput: {} } as never,
      { name: 'Bash' },
      { command: 'ls' },
      ctx as never,
    )
    // Un cliente móvil que responde desde una notificación no tiene la entrada
    // original y manda `{}` sólo para satisfacer el esquema. Tomarlo al pie de
    // la letra ejecutaría la herramienta sin argumentos.
    expect((d as { updatedInput: unknown }).updatedInput).toEqual({
      command: 'ls',
    })
  })

  test('17. permitir con entrada NO vacía usa la que llegó', async () => {
    const { permissionPromptToolResultToPermissionDecision } = await import(
      '../src/PermissionPromptToolResultSchema.ts'
    )
    const d = permissionPromptToolResultToPermissionDecision(
      { behavior: 'allow', updatedInput: { command: 'ls -la' } } as never,
      { name: 'Bash' },
      { command: 'ls' },
      contexto() as never,
    )
    expect((d as { updatedInput: unknown }).updatedInput).toEqual({
      command: 'ls -la',
    })
  })

  test('18. la razón de la decisión nombra la herramienta y su origen', async () => {
    const { permissionPromptToolResultToPermissionDecision } = await import(
      '../src/PermissionPromptToolResultSchema.ts'
    )
    const d = permissionPromptToolResultToPermissionDecision(
      { behavior: 'deny', message: 'no' } as never,
      { name: 'Write' },
      {},
      contexto() as never,
    )
    const razon = (d as { decisionReason: Record<string, unknown> })
      .decisionReason
    expect(razon.type).toBe('permissionPromptTool')
    expect(razon.permissionPromptToolName).toBe('Write')
  })

  test('19. denegar CON interrupción aborta; sin ella, no', async () => {
    const { permissionPromptToolResultToPermissionDecision } = await import(
      '../src/PermissionPromptToolResultSchema.ts'
    )
    const conInterrupcion = contexto()
    permissionPromptToolResultToPermissionDecision(
      { behavior: 'deny', message: 'no', interrupt: true } as never,
      { name: 'Bash' },
      {},
      conInterrupcion as never,
    )
    expect(conInterrupcion.abortController.abortado).toBe(true)

    const sinInterrupcion = contexto()
    permissionPromptToolResultToPermissionDecision(
      { behavior: 'deny', message: 'no' } as never,
      { name: 'Bash' },
      {},
      sinInterrupcion as never,
    )
    expect(sinInterrupcion.abortController.abortado).toBe(false)
  })

  test('20. permitir con permisos actualizados los aplica al estado', async () => {
    const { permissionPromptToolResultToPermissionDecision } = await import(
      '../src/PermissionPromptToolResultSchema.ts'
    )
    const { installPermissionHostBindings } = await import('../src/host.ts')
    installPermissionHostBindings({
      addPermissionRulesToSettings: () => true,
    })
    const ctx = contexto()
    permissionPromptToolResultToPermissionDecision(
      {
        behavior: 'allow',
        updatedInput: { a: 1 },
        updatedPermissions: [
          {
            type: 'addRules',
            rules: [{ toolName: 'Bash' }],
            behavior: 'allow',
            destination: 'session',
          },
        ],
      } as never,
      { name: 'Bash' },
      {},
      ctx as never,
    )
    expect(ctx.estados.length).toBe(1)
    const nuevo = ctx.estados[0] as {
      toolPermissionContext: { alwaysAllowRules?: Record<string, string[]> }
    }
    expect(nuevo.toolPermissionContext.alwaysAllowRules?.session).toEqual([
      'Bash',
    ])
  })
})

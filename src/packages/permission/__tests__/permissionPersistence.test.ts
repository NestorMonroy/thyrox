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
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
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

/**
 * Siembra el estado del archivo Y purga la caché de settings.
 *
 * Las dos mitades hacen falta. `getSettingsForSource` cachea por fuente, y esa
 * caché sólo se invalida desde dentro de `updateSettingsForSource`: una
 * escritura a mano la deja rancia, y el caso siguiente lee lo que sembró el
 * anterior. Medido — el caso 4 pasaba aislado y fallaba dentro de la suite,
 * que es la firma exacta de un estado que se filtra entre casos.
 *
 * La purga se hace con una actualización VACÍA por la API: `mergeWith` con
 * `{}` no cambia ningún valor y aun así llama al reseteo de caché, que es
 * privado y no se puede invocar de otro modo desde fuera del paquete.
 */
async function escribirLocal(contenido: unknown): Promise<void> {
  mkdirSync(dirname(rutaLocal()), { recursive: true })
  writeFileSync(rutaLocal(), JSON.stringify(contenido), 'utf8')
  const { updateSettingsForSource } = await import('@thyrox/config/settings')
  updateSettingsForSource('localSettings', {})
  updateSettingsForSource('userSettings', {})
}

beforeEach(async () => {
  const { installConfigHostBindings } = await import('@thyrox/config/host.js')
  installConfigHostBindings({
    getOriginalCwd: () => raiz,
    getConfigHomeDir: () => join(raiz, '.claude'),
  })
  // Los de `permission` también, y no es ceremonia: `persistPermissionUpdate`
  // registra su traza con `logForDebugging`, que los pide, así que sin ellos
  // LANZA aunque la rama no use ningún binding. Medido al escribir el tramo.
  const { installPermissionHostBindings } = await import('../src/host.ts')
  installPermissionHostBindings({})
  await escribirLocal({})
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
    //
    // ESTE CONTROL NO DISCRIMINA, Y SE DECLARA. Medido con la anulación:
    // retirando la guarda `supportsPersistence` los 20 casos siguen en verde,
    // porque `updateSettingsForSource` YA filtra por su cuenta — `session` no
    // resuelve a ninguna ruta de archivo, así que retorna sin escribir. Hay
    // DOS defensas para el mismo fenómeno y este caso sólo puede ver la de
    // fuera. Que la guarda sea redundante no la hace inútil: evita el viaje y
    // hace explícita la intención en el sitio donde se decide.
    // SUCESOR: la tarea #275.
    expect(leerLocal()).toEqual({})
  })

  test('2. añadir directorios los escribe, y NO duplica los que ya están', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    await escribirLocal({ permissions: { additionalDirectories: ['/ya'] } })
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
    await escribirLocal({ permissions: { additionalDirectories: ['/ya'] } })
    // Lo que se mide es la MARCA DE TIEMPO, no el contenido. Dos redacciones
    // anteriores no discriminaban: una clave testigo sobrevive al merge, y el
    // texto queda idéntico porque escribir lo mismo produce lo mismo. Una
    // escritura que no cambia nada sigue siendo una escritura, y sólo `mtime`
    // la ve. La espera de 5 ms separa las dos marcas: sin ella caerían en el
    // mismo instante y el control volvería a ser ciego.
    const antes = statSync(rutaLocal()).mtimeMs
    await new Promise(r => setTimeout(r, 5))
    persistPermissionUpdate({
      type: 'addDirectories',
      directories: ['/ya'],
      destination: 'localSettings',
    })
    // La guarda de «nada que añadir» evita una escritura de disco que no
    // cambia nada — y con ella, invalidar cachés río abajo por gusto.
    expect(statSync(rutaLocal()).mtimeMs).toBe(antes)
  })

  test('4. quitar directorios deja los que no se nombraron', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    await escribirLocal({ permissions: { additionalDirectories: ['/a', '/b', '/c'] } })
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
    await escribirLocal({ permissions: { allow: ['Bash(rm:*)', 'Read(//x)'] } })
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
    //
    // El par tiene que DIVERGIR en su forma para que el caso ejercite la
    // normalización: `Bash(rm -rf:*)` contra `{toolName, ruleContent}` da la
    // misma cadena por los dos caminos, así que comparar crudo pasaba igual
    // (medido — la primera redacción no discriminaba). `Bash(*)` sí diverge:
    // el comodín se colapsa y normaliza a `Bash` a secas.
    await escribirLocal({ permissions: { deny: ['Bash(*)', 'Read(//otro)'] } })
    persistPermissionUpdate({
      type: 'removeRules',
      rules: [{ toolName: 'Bash' }],
      behavior: 'deny',
      destination: 'localSettings',
    })
    expect((leerLocal().permissions as { deny: string[] }).deny).toEqual([
      'Read(//otro)',
    ])
  })

  test('8. añadir reglas escribe la regla en el archivo', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    persistPermissionUpdate({
      type: 'addRules',
      rules: [{ toolName: 'Bash', ruleContent: 'ls:*' }],
      behavior: 'allow',
      destination: 'localSettings',
    })
    expect((leerLocal().permissions as { allow: string[] }).allow).toEqual([
      'Bash(ls:*)',
    ])
  })

  test('9. añadir NO duplica una regla que ya está', async () => {
    const { persistPermissionUpdate } = await import('../src/PermissionUpdate.ts')
    // La rama delega en `addPermissionRulesToSettings`, que compara
    // normalizado: `Bash(*)` guardado y `{toolName:'Bash'}` pedido son la
    // MISMA regla. El primer tramo resolvía esto por host binding y lanzaba
    // sin él; el símbolo real ya existe en el paquete y se importa directo,
    // como hace la fuente.
    await escribirLocal({ permissions: { allow: ['Bash(*)'] } })
    persistPermissionUpdate({
      type: 'addRules',
      rules: [{ toolName: 'Bash' }],
      behavior: 'allow',
      destination: 'localSettings',
    })
    expect((leerLocal().permissions as { allow: string[] }).allow).toEqual([
      'Bash(*)',
    ])
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

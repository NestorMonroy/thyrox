/**
 * La mitad ROJA de TodoWrite y de las tres piezas que lo bloqueaban.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/{todo/types.ts,
 * tools/AgentTool/constants.ts, tools/FileEditTool/constants.ts,
 * tools/TodoWriteTool/}`. Ese árbol no declara licencia, así que los cuerpos
 * se reimplementan y no se copian.
 *
 * POR QUÉ ESTE TRAMO Y NO TaskCreate. El sondeo anterior midió que los
 * ESPECIFICADORES de TaskCreateTool resuelven, y concluyó que estaba libre.
 * Medido ahora a nivel de SÍMBOLO, no lo está: importa
 * `executeTaskCreatedHooks` de `@thyrox/agent/hooks.js`, y ese archivo aquí
 * exporta 7 símbolos, ninguno de ellos ése — es el motor de hooks
 * (`executeHooks`, 5427 líneas en la fuente), que no está portado. Medir el
 * significante (¿resuelve el módulo?) y concluir sobre el significado
 * (¿existe el símbolo?) es el sub-patrón C, y produjo un falso «libre».
 *
 * TodoWrite sí lo está: sus tres importaciones de paquete hermano
 * —`getSessionId`, `getFeatureValue_CACHED_MAY_BE_STALE`, `isTodoV2Enabled`—
 * se comprobaron por carga real, y sus tres bloqueos son locales y baratos.
 *
 * Métrica: qué guarda TodoWrite en el estado, cuándo se habilita, y qué
 * texto arma para quien lee el resultado.
 * Ciega a: el despacho —si el bucle lo llama— y la rama del empujón de
 * verificación, que exige la macro `feature('VERIFICATION_AGENT')` y aquí es
 * un sustituto que siempre devuelve `false` (ver `pendingCrossPackageDeps`).
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  resetStateForTests,
  setIsInteractive,
} from '@thyrox/app-host/bootstrap/state.js'
import {
  AGENT_TOOL_NAME,
  LEGACY_AGENT_TOOL_NAME,
  ONE_SHOT_BUILTIN_AGENT_TYPES,
  VERIFICATION_AGENT_TYPE,
} from '../AgentTool/constants.ts'
import {
  CLAUDE_FOLDER_PERMISSION_PATTERN,
  FILE_EDIT_TOOL_NAME,
  FILE_UNEXPECTEDLY_MODIFIED_ERROR,
  GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN,
} from '../FileEditTool/constants.ts'
import { TodoItemSchema, TodoListSchema } from '../../todo/types.ts'
import { TodoWriteTool } from '../TodoWriteTool/TodoWriteTool.ts'

let estado: Record<string, any>

/** El contexto que `call` recibe: sólo lee y escribe el estado. */
function ctx(agentId?: string) {
  return {
    agentId,
    getAppState: () => estado,
    setAppState: (f: (prev: any) => any) => {
      estado = f(estado)
    },
  } as never
}

beforeEach(() => {
  estado = { todos: {} }
  resetStateForTests()
  setIsInteractive(true)
})

afterEach(() => {
  resetStateForTests()
})

describe('AgentTool/constants — 3 casos', () => {
  test('1. el nombre de protocolo y su forma heredada son distintos', () => {
    // El heredado NO se retira: lo siguen citando reglas de permiso, hooks y
    // sesiones reanudadas escritas antes del renombre.
    expect(AGENT_TOOL_NAME).toBe('Agent')
    expect(LEGACY_AGENT_TOOL_NAME).toBe('Task')
  })

  test('2. el tipo de agente verificador se nombra en minúscula', () => {
    expect(VERIFICATION_AGENT_TYPE).toBe('verification')
  })

  test('3. los agentes de un solo tiro son un conjunto, no una lista', () => {
    // Es un `Set` porque el consumidor pregunta por pertenencia en cada
    // vuelta; con un arreglo el coste sería lineal y `.has` no existiría.
    expect(ONE_SHOT_BUILTIN_AGENT_TYPES.has('Explore')).toBe(true)
    expect(ONE_SHOT_BUILTIN_AGENT_TYPES.has('Plan')).toBe(true)
    expect(ONE_SHOT_BUILTIN_AGENT_TYPES.has('Agent')).toBe(false)
    expect(ONE_SHOT_BUILTIN_AGENT_TYPES.size).toBe(2)
  })
})

describe('FileEditTool/constants — 2 casos', () => {
  test('4. las cuatro constantes llevan su valor de la fuente', () => {
    expect(FILE_EDIT_TOOL_NAME).toBe('Edit')
    expect(CLAUDE_FOLDER_PERMISSION_PATTERN).toBe('/.claude/**')
    expect(GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN).toBe('~/.claude/**')
    expect(FILE_UNEXPECTEDLY_MODIFIED_ERROR).toContain(
      'unexpectedly modified',
    )
  })

  test('5. el archivo NO importa nada — es su razón de existir', async () => {
    // La fuente lo declara en su primera línea: «In its own file to avoid
    // circular dependencies». Un import aquí reintroduce el ciclo que el
    // archivo existe para cortar.
    const texto = await Bun.file(
      new URL('../FileEditTool/constants.ts', import.meta.url),
    ).text()
    expect(texto).not.toMatch(/^\s*import\s/m)
  })
})

describe('todo/types — 4 casos', () => {
  test('6. un item válido pasa con sus tres campos', () => {
    const r = TodoItemSchema().safeParse({
      content: 'correr las pruebas',
      status: 'in_progress',
      activeForm: 'corriendo las pruebas',
    })
    expect(r.success).toBe(true)
  })

  test('7. el contenido vacío se rechaza, y el mensaje lo dice', () => {
    const r = TodoItemSchema().safeParse({
      content: '',
      status: 'pending',
      activeForm: 'algo',
    })
    expect(r.success).toBe(false)
    expect(JSON.stringify(r.error)).toContain('Content cannot be empty')
  })

  test('8. la forma activa vacía se rechaza aparte del contenido', () => {
    const r = TodoItemSchema().safeParse({
      content: 'algo',
      status: 'pending',
      activeForm: '',
    })
    expect(r.success).toBe(false)
    expect(JSON.stringify(r.error)).toContain('Active form cannot be empty')
  })

  test('9. el estado es un enum cerrado de tres', () => {
    for (const status of ['pending', 'in_progress', 'completed']) {
      expect(
        TodoItemSchema().safeParse({ content: 'c', status, activeForm: 'a' })
          .success,
      ).toBe(true)
    }
    expect(
      TodoItemSchema().safeParse({
        content: 'c',
        status: 'blocked',
        activeForm: 'a',
      }).success,
    ).toBe(false)
    expect(TodoListSchema().safeParse([]).success).toBe(true)
  })
})

describe('TodoWriteTool — 8 casos', () => {
  test('10. se nombra TodoWrite y NO se muestra a la persona', () => {
    // La cadena vacía es deliberada en la fuente: el útil no aparece en la
    // línea de estado, sólo su efecto en el panel.
    expect(TodoWriteTool.name).toBe('TodoWrite')
    expect(TodoWriteTool.userFacingName()).toBe('')
  })

  test('11. se habilita al REVÉS que la familia Task', () => {
    // Es la decisión que hace que las dos familias no coexistan: TaskGet y
    // TaskList se encienden con `isTodoV2Enabled()`, éste con su negación.
    setIsInteractive(true)
    expect(TodoWriteTool.isEnabled()).toBe(false)
    setIsInteractive(false)
    expect(TodoWriteTool.isEnabled()).toBe(true)
  })

  test('12. no pide permiso: devuelve la entrada intacta', async () => {
    const entrada = { todos: [] }
    const r = await TodoWriteTool.checkPermissions(entrada as never, ctx())
    expect(r).toEqual({ behavior: 'allow', updatedInput: entrada })
  })

  test('13. la lista se guarda bajo el id de sesión cuando no hay agente', async () => {
    const todos = [
      { content: 'una', status: 'pending', activeForm: 'haciendo una' },
    ]
    await TodoWriteTool.call({ todos } as never, ctx())
    const claves = Object.keys(estado.todos)
    expect(claves).toHaveLength(1)
    expect(estado.todos[claves[0]!]).toEqual(todos)
  })

  test('14. un subagente escribe bajo SU id, no bajo el de la sesión', async () => {
    // Sin esta separación, dos subagentes concurrentes se pisarían la lista.
    const todos = [
      { content: 'una', status: 'pending', activeForm: 'haciendo una' },
    ]
    await TodoWriteTool.call({ todos } as never, ctx('agente-7'))
    expect(estado.todos['agente-7']).toEqual(todos)
  })

  test('15. una lista TODA completada se VACÍA en el estado', async () => {
    // Es la decisión no obvia: el panel no debe quedar con una lista de
    // tareas hechas, porque la siguiente vuelta la leería como trabajo vivo.
    const todos = [
      { content: 'una', status: 'completed', activeForm: 'haciendo una' },
      { content: 'dos', status: 'completed', activeForm: 'haciendo dos' },
    ]
    await TodoWriteTool.call({ todos } as never, ctx())
    const clave = Object.keys(estado.todos)[0]!
    expect(estado.todos[clave]).toEqual([])
  })

  test('16. pero el resultado devuelve la lista COMPLETA, no la vaciada', async () => {
    // La distinción importa: el estado se vacía para el panel; quien lee el
    // resultado tiene que ver qué se cerró.
    const todos = [
      { content: 'una', status: 'completed', activeForm: 'haciendo una' },
    ]
    const { data } = await TodoWriteTool.call({ todos } as never, ctx())
    expect(data.newTodos).toEqual(todos)
    expect(data.oldTodos).toEqual([])
  })

  test('17. la lista ANTERIOR viaja en el resultado', async () => {
    const previa = [
      { content: 'vieja', status: 'pending', activeForm: 'haciendo vieja' },
    ]
    const c = ctx()
    await TodoWriteTool.call({ todos: previa } as never, c)
    const nueva = [
      { content: 'nueva', status: 'pending', activeForm: 'haciendo nueva' },
    ]
    const { data } = await TodoWriteTool.call({ todos: nueva } as never, c)
    expect(data.oldTodos).toEqual(previa)
    expect(data.newTodos).toEqual(nueva)
  })
})

describe('TodoWriteTool — el bloque de resultado, 2 casos', () => {
  test('18. sin empujón, el texto base y nada más', () => {
    const bloque = TodoWriteTool.mapToolResultToToolResultBlockParam(
      { oldTodos: [], newTodos: [], verificationNudgeNeeded: false },
      'uso-1',
    )
    expect(String(bloque.content)).toContain('Todos have been modified')
    expect(String(bloque.content)).not.toContain(VERIFICATION_AGENT_TYPE)
    expect(bloque.tool_use_id).toBe('uso-1')
  })

  test('19. con empujón, el texto nombra al agente verificador', () => {
    // La rama NO la puede disparar `call` aquí —la macro de compilación es
    // un sustituto que devuelve `false`—, así que se ejercita por su
    // entrada, que es donde el texto se arma.
    const bloque = TodoWriteTool.mapToolResultToToolResultBlockParam(
      { oldTodos: [], newTodos: [], verificationNudgeNeeded: true },
      'uso-2',
    )
    expect(String(bloque.content)).toContain(
      `subagent_type="${VERIFICATION_AGENT_TYPE}"`,
    )
    expect(String(bloque.content)).toContain('verification step')
  })
})

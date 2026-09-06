/**
 * Porte de `ccnmt: packages/agent/__tests__/agentContextGuards.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia
 * es el idioma de la descripción.
 *
 * Tests de los type guards de agentContext + los helpers de
 * AsyncLocalStorage. Un type guard equivocado confunde la atribución de
 * analítica (eventos de subagente etiquetados como teammate o viceversa) y
 * enruta mal datos de sesión (un `parent_session_id` de un contexto de
 * teammate atribuido al transcript de un subagente).
 *
 * El par runWithAgentContext + getAgentContext protege la concurrencia
 * asíncrona: cada subagente en segundo plano debe ver SU PROPIO contexto,
 * no el que dejó puesto por última vez un hermano sobre AppState.
 *
 * NOTA sobre `isTeammateAgentContext`: en `../agentSwarmsEnabled.ts` de este
 * árbol, `isAgentSwarmsEnabled()` siempre devuelve el `fallback` (`true`) —
 * no hay cliente GrowthBook que lo apague (ver la cabecera de ese archivo,
 * DEC-04). Ningún caso de este porte depende del valor exacto de la
 * puerta: el primer caso sólo fija que el tipo de retorno sea booleano
 * (documentado así también en la fuente, por la misma razón — el valor
 * depende del entorno), y los otros dos fijan `false` por el `agentType`
 * del contexto (`'subagent'` o ausente), no por el estado de la puerta.
 */
import { describe, expect, test } from 'bun:test'
import {
  type AgentContext,
  consumeInvokingRequestId,
  getAgentContext,
  getSubagentLogName,
  isSubagentContext,
  isTeammateAgentContext,
  runWithAgentContext,
  type SubagentContext,
  type TeammateAgentContext,
} from '../agentContext.ts'

const subagent = (
  o: Partial<SubagentContext> = {},
): SubagentContext => ({
  agentId: 'a-deadbeef',
  agentType: 'subagent',
  ...o,
})

const teammate = (o: Partial<TeammateAgentContext> = {}): TeammateAgentContext => ({
  agentId: 'researcher@my-team',
  agentName: 'researcher',
  teamName: 'my-team',
  parentSessionId: 'parent-session',
  planModeRequired: false,
  isTeamLead: false,
  agentType: 'teammate',
  ...o,
})

describe('isSubagentContext', () => {
  test('SubagentContext → true', () => {
    expect(isSubagentContext(subagent())).toBe(true)
  })

  test('TeammateAgentContext → false', () => {
    expect(isSubagentContext(teammate())).toBe(false)
  })

  test('undefined → false', () => {
    expect(isSubagentContext(undefined)).toBe(false)
  })

  test('objeto sin agentType → false', () => {
    expect(isSubagentContext({} as never)).toBe(false)
  })

  test('agentType="future" → false (igualdad estricta)', () => {
    expect(
      isSubagentContext({ agentType: 'future' } as unknown as AgentContext),
    ).toBe(false)
  })
})

describe('isTeammateAgentContext', () => {
  // NOTA: la función depende de isAgentSwarmsEnabled(), que en este árbol
  // siempre devuelve el fallback (true, sin cliente GrowthBook — DEC-04
  // en agentSwarmsEnabled.ts). Se fija sólo lo que no depende de ese
  // valor — ver la cabecera del archivo.

  test('TeammateAgentContext bajo el entorno de test por defecto → devuelve boolean (la puerta puede estar prendida o apagada)', () => {
    // Contrato documentado: cuando la puerta de swarm está apagada, el
    // type guard corta en corto a false incluso para un teammate válido.
    // El entorno puro de test no fija ninguna señal que la controle en
    // uno u otro sentido en la fuente original; aquí tampoco. De cualquier
    // forma, se fija que la función devuelve boolean y es invocable.
    const r = isTeammateAgentContext(teammate())
    expect(typeof r).toBe('boolean')
  })

  test('SubagentContext → false', () => {
    expect(isTeammateAgentContext(subagent())).toBe(false)
  })

  test('undefined → false', () => {
    expect(isTeammateAgentContext(undefined)).toBe(false)
  })
})

describe('runWithAgentContext + getAgentContext', () => {
  test('fuera de cualquier contexto → undefined', () => {
    expect(getAgentContext()).toBeUndefined()
  })

  test('dentro de runWithAgentContext → el contexto es visible', () => {
    const ctx = subagent({ agentId: 'a-test123' })
    runWithAgentContext(ctx, () => {
      expect(getAgentContext()).toBe(ctx)
    })
  })

  test('el contexto se restaura al retornar la función', () => {
    runWithAgentContext(subagent({ agentId: 'a-1' }), () => {
      expect(getAgentContext()?.agentId).toBe('a-1')
    })
    expect(getAgentContext()).toBeUndefined()
  })

  test('runWithAgentContext anidado: el interno pisa al externo; el externo se restaura', () => {
    const outer = subagent({ agentId: 'outer' })
    const inner = subagent({ agentId: 'inner' })
    runWithAgentContext(outer, () => {
      expect(getAgentContext()?.agentId).toBe('outer')
      runWithAgentContext(inner, () => {
        expect(getAgentContext()?.agentId).toBe('inner')
      })
      expect(getAgentContext()?.agentId).toBe('outer')
    })
    expect(getAgentContext()).toBeUndefined()
  })

  test('el valor de retorno de fn se reenvía', () => {
    const r = runWithAgentContext(subagent(), () => 42)
    expect(r).toBe(42)
  })
})

describe('getSubagentLogName', () => {
  test('fuera de un contexto de subagente → undefined', () => {
    expect(getSubagentLogName()).toBeUndefined()
  })

  test('dentro de un contexto de subagente pero sin subagentName → undefined', () => {
    runWithAgentContext(subagent(), () => {
      expect(getSubagentLogName()).toBeUndefined()
    })
  })

  test('subagente incorporado (built-in) → devuelve subagentName tal cual', () => {
    runWithAgentContext(
      subagent({ subagentName: 'Explore', isBuiltIn: true }),
      () => {
        expect(getSubagentLogName()).toBe('Explore')
      },
    )
  })

  test('no incorporado (definido por el usuario) → literal "user-defined"', () => {
    runWithAgentContext(
      subagent({ subagentName: 'my-custom-agent', isBuiltIn: false }),
      () => {
        expect(getSubagentLogName()).toBe('user-defined')
      },
    )
  })

  test('isBuiltIn indefinido → "user-defined" (default)', () => {
    runWithAgentContext(subagent({ subagentName: 'X' }), () => {
      expect(getSubagentLogName()).toBe('user-defined')
    })
  })

  test('contexto de teammate (no subagente) → undefined', () => {
    runWithAgentContext(teammate(), () => {
      expect(getSubagentLogName()).toBeUndefined()
    })
  })
})

describe('consumeInvokingRequestId', () => {
  test('fuera de contexto → undefined', () => {
    expect(consumeInvokingRequestId()).toBeUndefined()
  })

  test('contexto sin invokingRequestId → undefined', () => {
    runWithAgentContext(subagent(), () => {
      expect(consumeInvokingRequestId()).toBeUndefined()
    })
  })

  test('contexto con invokingRequestId: la primera llamada lo devuelve', () => {
    const ctx = subagent({ invokingRequestId: 'req-abc', invocationKind: 'spawn' })
    runWithAgentContext(ctx, () => {
      const r = consumeInvokingRequestId()
      expect(r).toEqual({
        invokingRequestId: 'req-abc',
        invocationKind: 'spawn',
      })
    })
  })

  test('segunda llamada tras la primera → undefined (semántica de borde disperso)', () => {
    // Contrato documentado: emite exactamente una vez por invocación.
    runWithAgentContext(
      subagent({ invokingRequestId: 'req-abc', invocationKind: 'resume' }),
      () => {
        expect(consumeInvokingRequestId()).toBeDefined()
        expect(consumeInvokingRequestId()).toBeUndefined()
      },
    )
  })

  test('muta context.invocationEmitted = true tras la primera llamada', () => {
    const ctx = subagent({ invokingRequestId: 'req-abc' })
    runWithAgentContext(ctx, () => {
      consumeInvokingRequestId()
      expect(ctx.invocationEmitted).toBe(true)
    })
  })

  test('respeta invocationEmitted pre-fijado: se salta de inmediato', () => {
    runWithAgentContext(
      subagent({ invokingRequestId: 'req-x', invocationEmitted: true }),
      () => {
        expect(consumeInvokingRequestId()).toBeUndefined()
      },
    )
  })

  test('invocationKind: undefined se acepta (pasa tal cual)', () => {
    runWithAgentContext(subagent({ invokingRequestId: 'req-y' }), () => {
      const r = consumeInvokingRequestId()
      expect(r?.invocationKind).toBeUndefined()
    })
  })

  test('un contexto de teammate con invokingRequestId también funciona', () => {
    runWithAgentContext(
      teammate({ invokingRequestId: 'req-team', invocationKind: 'spawn' }),
      () => {
        const r = consumeInvokingRequestId()
        expect(r?.invokingRequestId).toBe('req-team')
      },
    )
  })
})

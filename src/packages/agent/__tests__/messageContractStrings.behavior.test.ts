/**
 * Porte de `ccnmt: packages/agent/__tests__/messageContractStrings.behavior.test.ts`.
 *
 * Fija el formato EXACTO de las cadenas de protocolo entre el harness y el
 * modelo. Son tres clases:
 *
 *  1. Interrupcion y cancelacion: el modelo las ve como mensajes de rol
 *     `user` y usa el prefijo literal para decidir si cede el turno o
 *     pregunta.
 *  2. Mensajes de rechazo: le dicen al modelo que la herramienta NO corrio
 *     y con que criterio reintentar, buscar un rodeo o abortar.
 *  3. Marcadores de relleno: contenido sintetico que el flujo del API
 *     inyecta para que el par `tool_use`/`tool_result` siga siendo valido.
 *
 * Cualquier deriva aqui cambia la conducta del modelo al interrumpir o al
 * denegar un permiso. Un refactor de «simplifiquemos la redaccion» ya ha
 * causado regresiones de conducta en produccion: por eso se fijan.
 */
import { describe, expect, test } from 'bun:test'

import {
  AUTO_REJECT_MESSAGE,
  CANCEL_MESSAGE,
  DENIAL_WORKAROUND_GUIDANCE,
  DONT_ASK_REJECT_MESSAGE,
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  NO_RESPONSE_REQUESTED,
  PLAN_REJECTION_PREFIX,
  REJECT_MESSAGE,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  SUBAGENT_REJECT_MESSAGE,
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
  SYNTHETIC_TOOL_RESULT_PLACEHOLDER,
} from '../messages.ts'

describe('cadenas de contrato del mensaje (harness ↔ modelo)', () => {
  describe('interrupcion y cancelacion', () => {
    test('INTERRUPT_MESSAGE conserva el formato exacto entre corchetes', () => {
      expect(INTERRUPT_MESSAGE).toBe('[Request interrupted by user]')
    })

    test('INTERRUPT_MESSAGE_FOR_TOOL_USE distingue la interrupcion a media herramienta', () => {
      // Se usa cuando el usuario pulsa Ctrl-C con una herramienta en
      // ejecucion: el modelo necesita saber que lo cancelado fue LA
      // HERRAMIENTA, no la peticion entera.
      expect(INTERRUPT_MESSAGE_FOR_TOOL_USE).toBe(
        '[Request interrupted by user for tool use]',
      )
    })

    test('CANCEL_MESSAGE dice STOP en mayusculas para que el modelo se detenga', () => {
      // La mayuscula de «STOP» es convencion con carga: el modelo la
      // atiende como senal dura de alto.
      expect(CANCEL_MESSAGE).toContain('STOP what you are doing')
      expect(CANCEL_MESSAGE).toContain(
        'wait for the user to tell you how to proceed',
      )
    })
  })

  describe('mensajes de rechazo', () => {
    test('REJECT_MESSAGE nombra el rechazo Y el ejemplo de la edicion no escrita', () => {
      // El parentesis «(eg. if it was a file edit, the new_string was NOT
      // written to the file)» es lo que impide que el modelo asuma que la
      // edicion SI se escribio. Sin el, una sesion de editar-y-verificar se
      // desincroniza tras una denegacion.
      expect(REJECT_MESSAGE).toContain('was rejected')
      expect(REJECT_MESSAGE).toContain(
        'the new_string was NOT written to the file',
      )
      expect(REJECT_MESSAGE).toContain('STOP')
    })

    test('REJECT_MESSAGE_WITH_REASON_PREFIX termina en salto de linea (el llamador anade la razon)', () => {
      expect(REJECT_MESSAGE_WITH_REASON_PREFIX).toMatch(/\n$/)
      expect(REJECT_MESSAGE_WITH_REASON_PREFIX).toContain('the user said:')
    })

    test('SUBAGENT_REJECT_MESSAGE le dice al subagente que adapte o reporte', () => {
      // El rechazo a un subagente no es el del usuario: el usuario no puede
      // intervenir, asi que el subagente debe adaptarse o reportar.
      expect(SUBAGENT_REJECT_MESSAGE).toContain('was rejected')
      expect(SUBAGENT_REJECT_MESSAGE).toContain(
        'Try a different approach or report the limitation',
      )
    })

    test('SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX termina en salto de linea', () => {
      expect(SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX).toMatch(/\n$/)
    })

    test('PLAN_REJECTION_PREFIX nombra el modo plan y la visibilidad del plan rechazado', () => {
      // Tras rechazar el plan, su contenido se apenda. Se fija el prefijo
      // estructural Y el marcador «Rejected plan:\n».
      expect(PLAN_REJECTION_PREFIX).toContain('proposed a plan that was rejected')
      expect(PLAN_REJECTION_PREFIX).toContain('Rejected plan:\n')
    })
  })

  describe('guia de rodeo ante una denegacion', () => {
    test('DENIAL_WORKAROUND_GUIDANCE abre con el prefijo IMPORTANT que el modelo atiende', () => {
      expect(DENIAL_WORKAROUND_GUIDANCE).toMatch(/^IMPORTANT:/)
    })

    test('DENIAL_WORKAROUND_GUIDANCE admite el rodeo benigno y prohibe la evasion', () => {
      // Dos frases fijadas que calibran la conducta del modelo:
      // - «naturally be used to accomplish this goal» → admite head-vs-cat
      // - «do not attempt to bypass the intent» → prohibe la evasion
      expect(DENIAL_WORKAROUND_GUIDANCE).toContain(
        'naturally be used to accomplish this goal',
      )
      expect(DENIAL_WORKAROUND_GUIDANCE).toContain(
        'should not* attempt to work around this denial in malicious ways',
      )
      expect(DENIAL_WORKAROUND_GUIDANCE).toContain(
        'bypass the intent behind this denial',
      )
    })

    test('AUTO_REJECT_MESSAGE compone el nombre de la herramienta con la guia', () => {
      const msg = AUTO_REJECT_MESSAGE('Bash')
      expect(msg).toContain('Permission to use Bash has been denied.')
      expect(msg).toContain(DENIAL_WORKAROUND_GUIDANCE)
    })

    test('DONT_ASK_REJECT_MESSAGE nombra el modo «don\'t ask» como denegacion autoexplicativa', () => {
      const msg = DONT_ASK_REJECT_MESSAGE('Write')
      expect(msg).toContain("Claude Code is running in don't ask mode")
      expect(msg).toContain('Permission to use Write has been denied')
    })
  })

  describe('marcadores de relleno', () => {
    test('NO_RESPONSE_REQUESTED es la cadena desnuda, sin espacio ni ajuste de punto', () => {
      expect(NO_RESPONSE_REQUESTED).toBe('No response requested.')
    })

    test('SYNTHETIC_TOOL_RESULT_PLACEHOLDER es reconocible y no vacio', () => {
      // El filtro de entrada rechaza cargas que contengan esta cadena. Se
      // fija su valor exacto para que un refactor no deje pasar en silencio
      // un marcador sintetico real.
      expect(SYNTHETIC_TOOL_RESULT_PLACEHOLDER).toBe(
        '[Tool result missing due to internal error]',
      )
      expect(SYNTHETIC_TOOL_RESULT_PLACEHOLDER.length).toBeGreaterThan(0)
    })
  })
})

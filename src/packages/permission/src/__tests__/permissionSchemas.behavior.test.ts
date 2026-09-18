import { describe, expect, test } from 'bun:test'

import {
  permissionBehaviorSchema,
  permissionRuleValueSchema,
} from '../PermissionRule.ts'
import {
  permissionUpdateDestinationSchema,
  permissionUpdateSchema,
} from '../PermissionUpdateSchema.ts'

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/permissionSchemas.behavior.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Fija los esquemas Zod de las reglas y las actualizaciones de permiso. Son
 * el formato de intercambio de los archivos de ajustes
 * (`.claude/settings.json`) y de los argumentos de la CLI. Una regresión que
 * ensanche o estreche el enum rompe en silencio la compatibilidad, hacia
 * adelante y hacia atrás, con los archivos de ajustes ya distribuidos.
 *
 * Invariantes fijados:
 *  1. `permissionBehaviorSchema` acepta EXACTAMENTE 'allow' | 'deny' | 'ask'
 *     (ni 'prompt' ni 'manual', aunque los dos se han considerado).
 *  2. `permissionRuleValueSchema` exige `toolName`; `ruleContent` es opcional.
 *  3. `permissionUpdateDestinationSchema` acepta EXACTAMENTE 5 destinos.
 *  4. `permissionUpdateSchema` discrimina por `type` entre 6 tipos de
 *     actualización.
 *  5. `addRules`, `replaceRules` y `removeRules` llevan `behavior` y `rules`.
 *  6. `setMode` lleva `mode` (el modo de permiso externo).
 *  7. `addDirectories` y `removeDirectories` llevan `directories` (string[]).
 */
describe('permission schemas (Zod wire-format pins)', () => {
  describe('permissionBehaviorSchema', () => {
    test('accepts allow/deny/ask (the 3 canonical behaviors)', () => {
      expect(permissionBehaviorSchema().parse('allow')).toBe('allow')
      expect(permissionBehaviorSchema().parse('deny')).toBe('deny')
      expect(permissionBehaviorSchema().parse('ask')).toBe('ask')
    })

    test('rejects "prompt" (commonly considered alias — must use "ask")', () => {
      // Fijado: 'prompt' NO es un comportamiento. Una regresión que lo
      // aceptara dejaría cargar en silencio archivos de ajustes inválidos.
      expect(() => permissionBehaviorSchema().parse('prompt')).toThrow()
    })

    test('rejects "manual" / "auto" / "" / undefined', () => {
      expect(() => permissionBehaviorSchema().parse('manual')).toThrow()
      expect(() => permissionBehaviorSchema().parse('auto')).toThrow()
      expect(() => permissionBehaviorSchema().parse('')).toThrow()
      expect(() => permissionBehaviorSchema().parse(undefined)).toThrow()
    })

    test('case-sensitive: ALLOW / Allow rejected', () => {
      // Fijado: en el archivo de ajustes TIENE que ir en minúscula exacta.
      expect(() => permissionBehaviorSchema().parse('ALLOW')).toThrow()
      expect(() => permissionBehaviorSchema().parse('Allow')).toThrow()
    })
  })

  describe('permissionRuleValueSchema', () => {
    test('toolName required (no toolName → reject)', () => {
      expect(() =>
        permissionRuleValueSchema().parse({ ruleContent: 'x' }),
      ).toThrow()
    })

    test('ruleContent optional (toolName-only rule passes)', () => {
      // Fijado: una regla «Bash» a secas casa con toda invocación de Bash;
      // es el caso corriente. `ruleContent` la estrecha.
      const result = permissionRuleValueSchema().parse({ toolName: 'Bash' })
      expect(result.toolName).toBe('Bash')
      expect(result.ruleContent).toBeUndefined()
    })

    test('toolName + ruleContent shape (the precise-match form)', () => {
      const result = permissionRuleValueSchema().parse({
        toolName: 'Bash',
        ruleContent: 'ls *',
      })
      expect(result).toEqual({ toolName: 'Bash', ruleContent: 'ls *' })
    })

    test('toolName must be string (number rejected)', () => {
      expect(() =>
        permissionRuleValueSchema().parse({ toolName: 42 }),
      ).toThrow()
    })
  })

  describe('permissionUpdateDestinationSchema', () => {
    test('accepts exactly 5 destinations', () => {
      // Fijado: los 5 ámbitos conocidos. El apilamiento de ajustes los lleva cableados.
      const destinations = [
        'userSettings',
        'projectSettings',
        'localSettings',
        'session',
        'cliArg',
      ]
      for (const d of destinations) {
        expect(permissionUpdateDestinationSchema().parse(d)).toBe(d)
      }
    })

    test('rejects "global" / "remote" / typos', () => {
      // Fijado: «global» es una errata frecuente por «userSettings».
      expect(() =>
        permissionUpdateDestinationSchema().parse('global'),
      ).toThrow()
      expect(() =>
        permissionUpdateDestinationSchema().parse('remote'),
      ).toThrow()
      expect(() =>
        permissionUpdateDestinationSchema().parse('user'),
      ).toThrow()
    })
  })

  describe('permissionUpdateSchema (discriminated union)', () => {
    test('addRules update with behavior + destination', () => {
      const result = permissionUpdateSchema().parse({
        type: 'addRules',
        rules: [{ toolName: 'Bash', ruleContent: 'ls *' }],
        behavior: 'allow',
        destination: 'session',
      })
      expect(result.type).toBe('addRules')
    })

    test('replaceRules accepted', () => {
      const result = permissionUpdateSchema().parse({
        type: 'replaceRules',
        rules: [],
        behavior: 'deny',
        destination: 'projectSettings',
      })
      expect(result.type).toBe('replaceRules')
    })

    test('removeRules accepted', () => {
      const result = permissionUpdateSchema().parse({
        type: 'removeRules',
        rules: [{ toolName: 'Bash' }],
        behavior: 'allow',
        destination: 'userSettings',
      })
      expect(result.type).toBe('removeRules')
    })

    test('setMode update carries `mode` (NOT `behavior`)', () => {
      // Fijado: `setMode` es estructuralmente distinto — fija el modo de
      // permiso en tiempo de ejecución (default, plan, acceptEdits,
      // bypassPermissions), no el comportamiento de una regla.
      const result = permissionUpdateSchema().parse({
        type: 'setMode',
        mode: 'plan',
        destination: 'session',
      })
      expect(result.type).toBe('setMode')
    })

    test('addDirectories carries `directories` string array', () => {
      const result = permissionUpdateSchema().parse({
        type: 'addDirectories',
        directories: ['/tmp/x', '/tmp/y'],
        destination: 'session',
      })
      expect(result.type).toBe('addDirectories')
    })

    test('removeDirectories carries `directories` string array', () => {
      const result = permissionUpdateSchema().parse({
        type: 'removeDirectories',
        directories: ['/tmp/x'],
        destination: 'projectSettings',
      })
      expect(result.type).toBe('removeDirectories')
    })

    test('unknown `type` rejected (no fallback)', () => {
      expect(() =>
        permissionUpdateSchema().parse({
          type: 'unknownType',
          rules: [],
          behavior: 'allow',
          destination: 'session',
        }),
      ).toThrow()
    })

    test('addRules with wrong destination → rejected', () => {
      expect(() =>
        permissionUpdateSchema().parse({
          type: 'addRules',
          rules: [{ toolName: 'Bash' }],
          behavior: 'allow',
          destination: 'bogusSettings',
        }),
      ).toThrow()
    })

    test('addRules without `behavior` → rejected (required field)', () => {
      expect(() =>
        permissionUpdateSchema().parse({
          type: 'addRules',
          rules: [{ toolName: 'Bash' }],
          destination: 'session',
        }),
      ).toThrow()
    })
  })
})

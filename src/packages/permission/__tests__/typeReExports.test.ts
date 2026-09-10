/**
 * Tests de humo para los módulos que son puro re-export/tipos:
 * `types/permissions.ts`, `toolPermission/permissionSourceTypes.ts` y
 * `PermissionRule.ts`. No hay lógica que ejercitar — el test confirma
 * que el módulo resuelve, que sus valores en tiempo de ejecución (los
 * que sí existen) están presentes, y que las formas de tipo compilan.
 */
import { describe, expect, test } from 'bun:test'
import { EXTERNAL_PERMISSION_MODES, PERMISSION_MODES } from '../src/types/permissions.ts'
import type {
  PermissionApprovalSource,
  PermissionRejectionSource,
} from '../src/toolPermission/permissionSourceTypes.ts'
import type {
  PermissionBehavior,
  PermissionRule,
  PermissionRuleSource,
  PermissionRuleValue,
} from '../src/PermissionRule.ts'

describe('types/permissions.ts — re-export hacia permissionTypes.ts', () => {
  test('EXTERNAL_PERMISSION_MODES / PERMISSION_MODES llegan intactos', () => {
    expect(EXTERNAL_PERMISSION_MODES).toContain('default')
    expect(PERMISSION_MODES).toContain('plan')
  })
})

describe('toolPermission/permissionSourceTypes.ts — sólo tipos', () => {
  test('las formas discriminadas compilan y se pueden construir', () => {
    const approval: PermissionApprovalSource = { type: 'user', permanent: true }
    const rejection: PermissionRejectionSource = {
      type: 'user_reject',
      hasFeedback: false,
    }
    expect(approval.type).toBe('user')
    expect(rejection.type).toBe('user_reject')
  })
})

describe('PermissionRule.ts — re-export de tipos (schemas Zod bloqueados)', () => {
  test('los cuatro tipos re-exportados forman un PermissionRule válido', () => {
    const behavior: PermissionBehavior = 'deny'
    const source: PermissionRuleSource = 'session'
    const value: PermissionRuleValue = { toolName: 'Bash', ruleContent: 'ls:*' }
    const rule: PermissionRule = { source, ruleBehavior: behavior, ruleValue: value }
    expect(rule.ruleBehavior).toBe('deny')
  })
})

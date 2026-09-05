/**
 * Ejecutor de hooks (T-007) — con el contrato del cliente, a propósito.
 *
 * Fuente del porte: el contrato del cliente —`hook_event_name`/`session_id`/
 * `transcript_path`/`cwd` por `stdin`, `hookSpecificOutput` por `stdout`,
 * **exit 2 bloquea**—, medido para que los hooks que este repo ya tiene corran
 * sin cambio. El test verifica ese contrato, no una forma propia.
 */

import { describe, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runHooks, type HookConfig } from '../src/hooks.ts'

// El contrato es el del cliente, a proposito (T-007): stdin JSON, stdout JSON,
// exit 2 = bloqueo con el stderr como razon. Asi los hooks del repo
// -register_agent_session.py, preModelSwitch.ts- corren bajo nuestro harness
// sin reescribirse.
function guion(cuerpo: string): string {
  const d = mkdtempSync(join(tmpdir(), 'hook-'))
  const p = join(d, 'h.sh')
  writeFileSync(p, `#!/bin/bash\n${cuerpo}\n`, 'utf8')
  chmodSync(p, 0o755)
  return p
}

const cfg = (comando: string, evento = 'PreToolUse'): HookConfig => ({
  [evento]: [{ hooks: [{ type: 'command', command: comando }] }],
})

describe('runHooks — el contrato del cliente', () => {
  test('el payload llega por stdin como JSON', async () => {
    const p = guion('cat > "$0.visto"')
    const r = await runHooks(cfg(p), 'PreToolUse', { session_id: 's', tool_name: 'Bash' })
    expect(r.blocked).toBe(false)
    expect(JSON.parse(await Bun.file(`${p}.visto`).text()).tool_name).toBe('Bash')
  })

  test('exit 2 bloquea y devuelve el stderr como razon', async () => {
    const r = await runHooks(cfg(guion('echo "no, por esto" >&2; exit 2')), 'PreToolUse', {})
    expect(r.blocked).toBe(true)
    expect(r.reason).toContain('no, por esto')
  })

  test('permissionDecision deny en el JSON de salida tambien bloquea', async () => {
    const salida = JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'ruta fuera del arbol' } })
    const r = await runHooks(cfg(guion(`echo '${salida}'`)), 'PreToolUse', {})
    expect(r.blocked).toBe(true)
    expect(r.reason).toContain('ruta fuera del arbol')
  })

  test('additionalContext se recoge y se entrega al bucle', async () => {
    const salida = JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: 'recuerda el gate' } })
    const r = await runHooks(cfg(guion(`echo '${salida}'`)), 'PreToolUse', {})
    expect(r.additionalContext).toEqual(['recuerda el gate'])
  })

  test('un hook que falla con otro codigo NO bloquea: su stderr se anota', async () => {
    const r = await runHooks(cfg(guion('echo roto >&2; exit 1')), 'PreToolUse', {})
    expect(r.blocked).toBe(false)
    expect(r.errors[0]).toContain('roto')
  })

  test('salida que no es JSON no rompe nada', async () => {
    const r = await runHooks(cfg(guion('echo hola')), 'PreToolUse', {})
    expect(r.blocked).toBe(false)
  })

  test('sin hooks para el evento, no se lanza nada', async () => {
    const r = await runHooks(cfg(guion('exit 2'), 'Stop'), 'PreToolUse', {})
    expect(r.blocked).toBe(false)
    expect(r.ran).toBe(0)
  })

  test('varios hooks del mismo evento corren todos y basta uno para bloquear', async () => {
    const c: HookConfig = { PreToolUse: [{ hooks: [
      { type: 'command', command: guion('exit 0') },
      { type: 'command', command: guion('echo veto >&2; exit 2') },
    ] }] }
    const r = await runHooks(c, 'PreToolUse', {})
    expect(r.ran).toBe(2)
    expect(r.blocked).toBe(true)
  })

  test('el matcher filtra por nombre de herramienta', async () => {
    const c: HookConfig = { PreToolUse: [{ matcher: 'Write|Edit', hooks: [{ type: 'command', command: guion('exit 2') }] }] }
    expect((await runHooks(c, 'PreToolUse', { tool_name: 'Bash' })).ran).toBe(0)
    expect((await runHooks(c, 'PreToolUse', { tool_name: 'Write' })).blocked).toBe(true)
  })

  test('un hook colgado se corta por timeout y no bloquea el turno', async () => {
    const c: HookConfig = { PreToolUse: [{ hooks: [{ type: 'command', command: guion('sleep 30'), timeout: 1 }] }] }
    const r = await runHooks(c, 'PreToolUse', {})
    expect(r.blocked).toBe(false)
    expect(r.errors[0]).toContain('timeout')
  })
})

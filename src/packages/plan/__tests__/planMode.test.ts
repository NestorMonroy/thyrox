/**
 * Controles de plan mode (TASK-API-0059): el contrato del modo, sin las
 * herramientas que lo envuelven.
 *
 * Fuente del porte: los esquemas de `EnterPlanMode`/`ExitPlanMode` del binario
 * 2.1.261 y los literales `planFilePath` / `planModeInstructions` /
 * `sparse`-`full`. Ver `src/mode.ts` para lo que el porte NO reproduce. Las
 * herramientas `EnterPlanMode`/`ExitPlanMode` se prueban en `@thyrox/tools`
 * (`__tests__/planTools.test.ts`), que es donde viven.
 *
 * Cada caso declara qué lo haría fallar — un control que no puede fallar es un
 * adorno (sub-patrón D de `metrica-decide-la-conclusion.md`).
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PlanMode, planFilePath, planModeInstructions, planModeVerdict, planVariantFor, renderPlan } from '../src/mode.ts'

function raiz(): string {
  return mkdtempSync(join(tmpdir(), 'planmode-'))
}


describe('la ruta del archivo de plan', () => {
  test('una plansDir relativa se resuelve contra la raíz del proyecto', () => {
    const root = raiz()
    const p = planFilePath('s1', { projectRoot: root, plansDir: '.claude/plans' })
    expect(p).toBe(join(root, '.claude/plans', 's1.md'))
  })

  test('sin plansDir cae en el hogar, no en la raíz del proyecto', () => {
    // Falla si alguien "simplifica" el default a projectRoot: el binario
    // declara `~/.claude/plans/` y esa diferencia decide dónde vive el plan.
    const p = planFilePath('s1', { projectRoot: raiz() })
    expect(p).toContain(join('.claude', 'plans', 's1.md'))
    expect(p.startsWith(raiz())).toBe(false)
  })
})

describe('el mensaje de sistema ramifica por existencia', () => {
  test('sin archivo manda crearlo; con archivo manda editarlo', () => {
    const root = raiz()
    const p = join(root, 'plan.md')
    expect(planModeInstructions(p)).toContain('Todavía no existe')
    writeFileSync(p, '# plan')
    expect(planModeInstructions(p)).toContain('Ya existe')
  })

  test('siempre nombra el archivo como única excepción de escritura', () => {
    const texto = planModeInstructions('/x/plan.md')
    expect(texto).toContain('única excepción')
    expect(texto).toContain('/x/plan.md')
    expect(texto).toContain('ExitPlanMode')
  })
})

describe('la puerta del modo', () => {
  test('deja leer, deniega ejecutar, y deja escribir SÓLO el archivo de plan', () => {
    const root = raiz()
    const modo = new PlanMode('s1', { projectRoot: root, plansDir: 'plans' })
    modo.enter()
    expect(planModeVerdict(modo, 'read', join(root, 'src/x.ts'))).toBeUndefined()
    expect(planModeVerdict(modo, 'write', modo.path)).toBeUndefined()
    const v = planModeVerdict(modo, 'write', join(root, 'src/x.ts'))
    expect(v?.decision).toBe('deny')
    expect(v?.rule).toBe('planMode')
    expect(planModeVerdict(modo, 'execute', '')?.decision).toBe('deny')
  })

  test('sin modo activo la puerta no opina — decide la normal', () => {
    // Falla si el modo denegara por defecto: haría inusable la sesión normal.
    const modo = new PlanMode('s1', { projectRoot: raiz(), plansDir: 'plans' })
    expect(planModeVerdict(modo, 'write', '/x')).toBeUndefined()
    expect(planModeVerdict(undefined, 'execute', '/x')).toBeUndefined()
  })
})

describe('el estado del modo', () => {
  test('pedir aprobación fuera del modo rehúsa y no cambia el estado', () => {
    // Falla si requestApproval saltara directo a awaitingApproval sin modo
    // activo: una aprobación sin plan en curso abriría la escritura al aprobar.
    const modo = new PlanMode('s1', { projectRoot: raiz(), plansDir: 'plans' })
    modo.write('# Plan')
    expect(modo.requestApproval()).toEqual({ ok: false, reason: 'plan mode no está activo' })
    expect(modo.current()).toBe('inactive')
  })

  test('esperar aprobación NO abre la escritura — sólo aprobar lo hace', () => {
    // Es la razón de que awaitingApproval sea un estado propio. Falla si
    // alguien colapsa los dos: el agente escribiría al pedir aprobación.
    const root = raiz()
    const modo = new PlanMode('s1', { projectRoot: root, plansDir: 'plans' })
    modo.enter()
    modo.write('# Plan')
    modo.requestApproval()
    expect(planModeVerdict(modo, 'write', join(root, 'x.ts'))?.decision).toBe('deny')
    modo.approve()
    expect(planModeVerdict(modo, 'write', join(root, 'x.ts'))).toBeUndefined()
  })

  test('rechazar devuelve a planificar, no a ejecutar', () => {
    const modo = new PlanMode('s1', { projectRoot: raiz(), plansDir: 'plans' })
    modo.enter()
    modo.write('# Plan')
    modo.requestApproval()
    expect(modo.reject()).toBe('planning')
    expect(modo.active()).toBe(true)
  })
})

describe('las tres variantes de render', () => {
  test('la variante se deriva del contexto, no se elige a mano', () => {
    expect(planVariantFor({ agentId: 'a1' })).toBe('subagent')
    expect(planVariantFor({ sparse: true })).toBe('sparse')
    expect(planVariantFor({})).toBe('full')
  })

  test('sparse recorta las líneas vacías; full no toca nada', () => {
    const texto = '# Plan\n\n1. Uno\n\n2. Dos\n'
    expect(renderPlan(texto, 'sparse')).toBe('# Plan\n1. Uno\n2. Dos')
    expect(renderPlan(texto, 'full')).toBe(texto)
    expect(renderPlan(texto, 'subagent')).toBe(texto.trim())
  })
})

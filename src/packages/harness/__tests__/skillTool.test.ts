/**
 * La herramienta `Skill` — el despacho de un skill al bucle (board #49).
 *
 * Fuente: diseño nativo sobre `SkillRegistry` (`src/skills/registry.ts`),
 * adaptado del contrato de inyección de la herramienta `Skill` del ejecutable
 * de referencia (el resultado de la herramienta ES el prompt del skill).
 *
 * El registry ya sabía registrar/listar/invocar; lo que faltaba era la vía
 * desde el modelo. `skillTool(registry)` la cierra. Los controles que
 * discriminan (sub-patrón D de `metrica-decide-la-conclusion.md`):
 *
 * - un skill DESCONOCIDO no devuelve un prompt vacío: devuelve `isError` y
 *   NOMBRA los registrados. Un verde sin ese control no distingue «invocó el
 *   skill» de «invocó cualquier cosa».
 * - `args` LLEGA al `getPrompt`: el caso lo echa de vuelta y el test lo exige
 *   en el `content`. Sin esto, dropear `args` pasaría inadvertido.
 * - un skill con `files` prefija el `content` con su base dir REAL (la
 *   extracción ocurrió). Sin el prefijo, el modelo no sabría dónde leer el
 *   apoyo.
 * - el hilo del `ToolContext` LLEGA al `getPrompt` (`SkillContext.messages`,
 *   #70): un caso pasa un hilo de dos mensajes y el skill echa de vuelta su
 *   longitud. El control D es el par: con hilo vacío llega vacío, con hilo
 *   poblado llega poblado — un verde no distingue «reenvía el hilo» de «lo
 *   descarta» sin medir los dos lados.
 */

import { describe, expect, test } from 'bun:test'
import { skillTool } from '../src/tools/skill.ts'
import { SkillRegistry } from '../src/skills/registry.ts'
import type { SkillContext } from '../src/skills/registry.ts'
import type { Message, ToolContext } from '../src/types.ts'

const ctx = (messages: Message[] = []): ToolContext =>
  ({ cwd: '/tmp', sessionId: 's', abort: new AbortController().signal, messages })

describe('skillTool — despacho de skill al bucle (board #49)', () => {
  test('invoca un skill registrado y su prompt vuelve como content', async () => {
    const reg = new SkillRegistry()
    reg.register({
      name: 'saludo',
      description: 'saluda',
      getPrompt: () => [{ type: 'text', text: 'Sigue el procedimiento de saludo.' }],
    })
    const r = await skillTool(reg).run({ skill: 'saludo' }, ctx())
    expect(r.isError).toBe(false)
    expect(r.content).toBe('Sigue el procedimiento de saludo.')
  })

  test('args llega al getPrompt — el control lo echa de vuelta', async () => {
    const reg = new SkillRegistry()
    let seen: SkillContext | null = null
    reg.register({
      name: 'eco',
      description: 'eco',
      getPrompt: (c) => {
        seen = c
        return [{ type: 'text', text: `args=[${c.args}]` }]
      },
    })
    const r = await skillTool(reg).run({ skill: 'eco', args: 'primer capítulo' }, ctx())
    expect(r.isError).toBe(false)
    expect(r.content).toContain('args=[primer capítulo]')
    // Un lado del control D: sin hilo, el `getPrompt` recibe el arreglo vacío.
    expect(seen!.messages).toEqual([])
    expect(seen!.cwd).toBe('/tmp')
  })

  test('el hilo del ToolContext llega al getPrompt (#70, otro lado del control D)', async () => {
    const reg = new SkillRegistry()
    let seen: SkillContext | null = null
    reg.register({
      name: 'resumen',
      description: 'lee el hilo',
      getPrompt: (c) => {
        seen = c
        return [{ type: 'text', text: `turnos=${c.messages.length}` }]
      },
    })
    const hilo: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'hola' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'qué tal' }] },
    ]
    const r = await skillTool(reg).run({ skill: 'resumen' }, ctx(hilo))
    expect(r.isError).toBe(false)
    expect(r.content).toBe('turnos=2')
    expect(seen!.messages).toEqual(hilo)
  })

  test('un skill con files prefija el content con su base dir real', async () => {
    const reg = new SkillRegistry()
    reg.register({
      name: 'conapoyo',
      description: 'con apoyo',
      files: { 'nota.txt': 'contenido de apoyo' },
      getPrompt: () => [{ type: 'text', text: 'Lee la nota de apoyo.' }],
    })
    const r = await skillTool(reg).run({ skill: 'conapoyo' }, ctx())
    expect(r.isError).toBe(false)
    // El prefijo lleva la ruta REAL de extracción — bajo la raíz nonce del registry.
    expect(r.content).toContain('Base directory for this skill:')
    expect(r.content).toContain(reg.root)
    expect(r.content).toContain('Lee la nota de apoyo.')
    // La extracción ocurrió UNA vez.
    expect(reg.extractions('conapoyo')).toBe(1)
  })

  test('skill desconocido: isError y nombra los registrados (control D)', async () => {
    const reg = new SkillRegistry()
    reg.register({ name: 'alfa', description: 'a', getPrompt: () => [{ type: 'text', text: 'x' }] })
    reg.register({ name: 'beta', description: 'b', getPrompt: () => [{ type: 'text', text: 'y' }] })
    const r = await skillTool(reg).run({ skill: 'gamma' }, ctx())
    expect(r.isError).toBe(true)
    expect(r.content).toContain('skill desconocido: gamma')
    expect(r.content).toContain('alfa')
    expect(r.content).toContain('beta')
  })

  test('un skill deshabilitado no se invoca', async () => {
    const reg = new SkillRegistry()
    reg.register({
      name: 'apagado',
      description: 'off',
      isEnabled: () => false,
      getPrompt: () => [{ type: 'text', text: 'no debería verse' }],
    })
    const r = await skillTool(reg).run({ skill: 'apagado' }, ctx())
    expect(r.isError).toBe(true)
    expect(r.content).toContain('skill desconocido: apagado')
    expect(r.content).not.toContain('no debería verse')
  })

  test('sin el campo skill: error de entrada', async () => {
    const reg = new SkillRegistry()
    const r = await skillTool(reg).run({}, ctx())
    expect(r.isError).toBe(true)
    expect(r.content).toContain("falta el campo obligatorio 'skill'")
  })

  test('la herramienta declara su forma: name Skill, permiso read, skill requerido', () => {
    const t = skillTool(new SkillRegistry())
    expect(t.name).toBe('Skill')
    expect(t.permission).toBe('read')
    expect(t.input_schema.required).toEqual(['skill'])
  })
})

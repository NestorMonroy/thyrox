/**
 * Las dos herramientas de plan mode (`EnterPlanMode`, `ExitPlanMode`).
 *
 * Porte del contrato medido en el binario 2.1.261 — ver `src/plan/mode.ts`
 * para la fuente y para lo que el porte NO reproduce.
 *
 * La asimetría entre las dos es lo que hay que conservar: `EnterPlanMode` no
 * recibe nada y **exige aprobación**; `ExitPlanMode` tampoco recibe el plan —
 * lo lee del archivo— y sólo **señala** que está listo. Pasarle el contenido
 * como parámetro sería otra herramienta: haría que el plan aprobado y el plan
 * escrito pudieran diferir.
 */
import type { Tool, ToolContext, ToolResult } from '../types.ts'
import type { PlanMode } from '../plan/mode.ts'
import { planModeInstructions } from '../plan/mode.ts'

const ok = (content: string): ToolResult => ({ content, isError: false })
const err = (content: string): ToolResult => ({ content, isError: true })

/**
 * El modo vivo de la sesión, inyectado por quien arma el registro.
 *
 * Se pasa por closure en vez de por `ToolContext` porque el modo es estado de
 * sesión y `ToolContext` es una instantánea por llamada: meterlo ahí obligaría
 * a copiarlo en cada invocación y a que dos copias pudieran divergir.
 */
export function planTools(mode: PlanMode): Tool[] {
  const enterPlanMode: Tool = {
    name: 'EnterPlanMode',
    description:
      'Entra en plan mode para diseñar un enfoque antes de escribir código. En el modo sólo se leen archivos; el único editable es el archivo de plan. Úsala ante trabajo no trivial: función nueva, varios enfoques válidos, cambios que tocan más de dos o tres archivos, o requisitos poco claros. No la uses para un arreglo de una línea ni para una tarea de sólo investigación.',
    permission: 'read',
    input_schema: { type: 'object', properties: {} },
    async run(_input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
      const previo = mode.current()
      mode.enter()
      if (previo !== 'inactive') {
        return ok(`plan mode ya estaba activo (${previo}). Archivo: ${mode.path}`)
      }
      return ok(planModeInstructions(mode.path))
    },
  }

  const exitPlanMode: Tool = {
    name: 'ExitPlanMode',
    description:
      'Señala que terminaste de escribir el plan en el archivo de plan y que está listo para que el usuario lo apruebe. NO recibe el contenido: lo lee del archivo que ya escribiste. Úsala sólo cuando el plan sea de pasos de implementación; para una tarea de investigación, no.',
    permission: 'read',
    input_schema: { type: 'object', properties: {} },
    async run(_input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
      const veredicto = mode.requestApproval()
      if (!veredicto.ok) return err(veredicto.reason ?? 'no se pudo pedir aprobación')
      return ok(`plan listo para aprobación (${mode.path}):\n\n${veredicto.plan}`)
    },
  }

  return [enterPlanMode, exitPlanMode]
}

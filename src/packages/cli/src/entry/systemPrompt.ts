/**
 * El prompt de sistema de la CLI, armado POR CAPAS (A.4.2).
 *
 * Antes de este módulo la CLI enviaba `flag(argv,'system')` o una frase fija,
 * así que el `CLAUDE.md` del proyecto no llegaba nunca al modelo y una regla
 * con `paths:` tampoco — ni la que casa ni la que no. El mecanismo que las
 * separa ya estaba escrito y probado en `@thyrox/agent`
 * (`loop/context/systemPrompt.ts`: `parseRule`, `matchesPath`, el filtro por
 * `targetPath`); lo que faltaba era que el punto de entrada lo llamara.
 *
 * Las capas, en orden de caché —de lo más estable a lo más volátil, que es
 * lo que permite que el prefijo se reutilice entre turnos:
 *
 *   base                       el prompt propio del harness; nunca se descarta
 *   CLAUDE.md                  el gobierno del proyecto
 *   .claude/CLAUDE.md          el gobierno de la sesión
 *   .claude/rules/*.md         sin `paths:`, el piso; con `paths:`, sólo si
 *                              `--target-path` casa alguno de sus patrones
 *
 * `--target-path` es lo que hace que la capa condicional DISCRIMINE. Sin él
 * ninguna regla condicional entra, y esa es la conducta correcta: una regla
 * que declara su dominio no se carga «por si acaso».
 */
import { assembleSystemPrompt, type Assembled } from '@thyrox/agent/loop/context/systemPrompt'
import { flag } from './flags.ts'

/**
 * El prompt por defecto cuando el proyecto no aporta ninguno.
 *
 * Es la BASE, no el prompt entero: lo que el árbol añada se apila encima.
 */
export const BASE_SYSTEM_PROMPT =
  'Eres un agente que trabaja con herramientas. Responde en español.'

/** Arma el prompt de la sesión desde `argv` y la raíz del proyecto. */
export function systemPromptFor(argv: string[], cwd: string): Assembled {
  const budget = flag(argv, 'system-budget-tokens')
  return assembleSystemPrompt({
    root: cwd,
    base: flag(argv, 'system') ?? BASE_SYSTEM_PROMPT,
    ...(flag(argv, 'target-path') ? { targetPath: flag(argv, 'target-path') as string } : {}),
    ...(budget ? { budgetTokens: Number(budget) } : {}),
  })
}

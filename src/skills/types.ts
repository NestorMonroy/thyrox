/**
 * El objeto que define un skill de Claude Code (no un agente).
 *
 * Adaptado del mismo patrón que `packages/agent/types.ts` — pero es OTRO
 * mecanismo del cliente, con OTRA forma de frontmatter, medida contra los 71
 * `SKILL.md` de las trece metodologías (ba/bpa/cp/dmaic/kanban/lean/pdca/pm/
 * pps/rm/rup/scrum/sp): `allowed-tools` es una cadena de herramientas
 * separadas por espacio (no una lista YAML, como en `tools:` del agente);
 * `metadata.triggers` es un bloque anidado que sólo 59 de los 71 declaran; y
 * el orden canónico de las claves — ver `emit/markdown.ts` — es el que 30 de
 * los 71 ya usaban en disco (metadata ANTES de updated_at), no una invención.
 *
 * *Métrica:* claves de primer nivel del frontmatter, extraídas por línea con
 * `awk` sobre los 71 `SKILL.md` de esas trece metodologías.
 * *Ciega a:* los otros 17 skills de este árbol (12 `workflow-*`, más
 * `cosmic`, `python-mcp`, `sphinx`, `thyrox`) — su frontmatter no se midió
 * aquí y NO se asume que comparta esta forma; `workflow-*` ya se sabe que no
 * (lleva `hooks:`, no `metadata.triggers`) por lectura directa de dos de
 * sus doce `SKILL.md`.
 */

/** Los cinco niveles de esfuerzo que el frontmatter de un skill admite. */
export const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export type EffortValue = (typeof EFFORT_LEVELS)[number]

export type SkillMetadata = {
  /** Frases de disparo, en el orden en que se declaran (no se ordenan). */
  triggers: string[]
}

export type SkillDefinition = {
  /** Identificador del skill; coincide con el nombre de su directorio. */
  name: string
  /** Cuándo usarlo. Frontmatter: `description: "…"`, siempre citada. */
  description: string
  /**
   * Herramientas permitidas. El cliente las declara como una CADENA
   * separada por espacio (`allowed-tools: Read Glob Grep Bash`), no como
   * lista — a diferencia de `tools:` del agente. El emisor las une con ' '.
   */
  allowedTools?: string[]
  effort?: EffortValue
  /** `disable-model-invocation: true` — el skill no se auto-invoca. */
  disableModelInvocation?: boolean
  metadata?: SkillMetadata
  /**
   * El cuerpo tras el frontmatter, verbatim. Prosa larga con Markdown propio
   * (tablas, rutas relativas a `./assets/` y `./references/` del propio
   * directorio del skill) — no se modela estructuralmente, por la misma
   * razón que `AgentDefinition.prompt`: mantenerlo estructurado exigiría un
   * parser de Markdown con pérdida, y el cuerpo YA es correcto en disco.
   */
  prompt: string
}

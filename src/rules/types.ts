/**
 * El objeto que define una REGLA de `.claude/rules/` — la tercera familia de
 * artefacto que THYROX produce, junto al agente (`packages/agent`) y al skill
 * (`skills/`). Los tres comparten el canal: definición en `src/`, emisión al
 * hogar del consumidor, gate de deriva.
 *
 * Por qué las reglas necesitan un productor, medido con
 * `verify/check_rule_divergence.py` sobre los seis árboles: 117 archivos de
 * regla, 45 nombres, 33 compartidos por más de un árbol y sólo 3 idénticos
 * byte a byte. Cada consumidor lee su copia y las cita como si fueran la
 * misma regla.
 *
 * El eje que separa a esta familia de las otras dos: una regla se carga
 * INCONDICIONALMENTE salvo que declare `paths:`. La documentación del cliente
 * lo fija — «Rules without a `paths` field are loaded unconditionally and
 * apply to all files» — así que el campo no es adorno: es lo único que separa
 * una regla del piso siempre-cargado que cada subagente vuelve a pagar.
 */

/**
 * Qué gobierna la regla, y por tanto cómo se carga.
 *
 * - `universal`: gobierna todo trabajo del árbol. Se emite sin `paths:`.
 * - `domain`: gobierna un dominio. Se emite CON `paths:`, y sin él no se
 *   emite: una regla de dominio sin su filtro es piso siempre-cargado
 *   disfrazado de regla acotada.
 */
export type RuleScope = 'universal' | 'domain'

/**
 * Un parámetro del consumidor: el valor que la regla NO puede fijar porque
 * cambia entre consumidores (la identidad de commit, el motor de base, la
 * raíz del árbol de producto).
 *
 * Se resuelve por DOS ENTRADAS, ambas de entorno y en este orden —la forma
 * que `paths/reach.ts` ya usa y que la referencia VVV usa en
 * `get_config_value <clave> <default>`:
 *
 *   1. la variable del proceso, o la del `.env` que la declara (`envValue`);
 *   2. el `fallback` declarado aquí.
 *
 * Sin ninguna de las dos el emisor REHÚSA: emitir una regla con un
 * marcador sin resolver publicaría prosa que nadie puede cumplir.
 */
export type RuleParameter = {
  /** El marcador en el cuerpo: `{{name}}`. */
  name: string
  /** La clave de entorno que lo declara en el consumidor. */
  envVar: string
  /** Qué es, para el mensaje del emisor cuando no se puede resolver. */
  description: string
  /** Valor por defecto. Sin él, la clave es obligatoria. */
  fallback?: string
}

export type RuleDefinition = {
  /** Nombre del archivo emitido, sin extensión: `git-author-identity`. */
  name: string
  scope: RuleScope
  /**
   * Los globos de `paths:` del frontmatter. Obligatorio en `domain`,
   * prohibido en `universal` — un `paths:` en una regla universal la
   * apagaría fuera de sus rutas sin que nadie lo note.
   */
  paths?: string[]
  /** Los parámetros que el cuerpo referencia con `{{name}}`. */
  parameters?: RuleParameter[]
  /** El cuerpo en Markdown, con sus marcadores sin resolver. */
  body: string
}

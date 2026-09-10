/**
 * Dobles de permiso en memoria, para que un test declare su decisión en vez
 * de montar el mecanismo entero.
 *
 * Procedencia: `ccnmt: packages/permission/src/testing/index.ts` (77
 * líneas, 3 clases + 1 tipo). Ese árbol declara `"license": "UNLICENSED"`,
 * así que los cuerpos se reimplementan y no se copian. Porte COMPLETO.
 *
 * REGLA DURA, heredada de la fuente: este módulo NO importa nada — ni de lo
 * interno del paquete, ni de fuera. Si lo hiciera, un cambio interno
 * rompería los tests de sus consumidores, que es justo lo contrario de para
 * lo que existe un doble. La suite lo verifica midiendo el archivo, no
 * confiando en la disciplina de quien lo edite.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */

export type PermissionDecision = {
  behavior: 'allow' | 'deny' | 'ask'
  updatedInput?: unknown
}

/** Permite siempre — para tests a los que el permiso les da igual. */
export class AllowAllPermission {
  check(_tool: string, _input: unknown): PermissionDecision {
    return { behavior: 'allow' }
  }
}

/** Niega siempre — para ejercitar el camino de la negación. */
export class DenyAllPermission {
  check(_tool: string, _input: unknown): PermissionDecision {
    return { behavior: 'deny' }
  }
}

/**
 * Entrega las decisiones en el orden declarado.
 *
 * Revienta al agotarse en vez de repetir la última o devolver algo por
 * defecto: un test que pide más decisiones de las que declaró tiene un
 * defecto en su guion, y un doble silencioso lo escondería.
 *
 * ```ts
 * const permiso = new ScriptedPermission([
 *   { behavior: 'allow' },
 *   { behavior: 'deny' },
 * ])
 * permiso.check('Bash', {})     // → allow
 * permiso.check('FileEdit', {}) // → deny
 * ```
 */
export class ScriptedPermission {
  private readonly _decisions: PermissionDecision[]
  private _index = 0

  constructor(decisions: PermissionDecision[]) {
    this._decisions = decisions
  }

  check(_tool: string, _input: unknown): PermissionDecision {
    if (this._index >= this._decisions.length) {
      throw new Error(
        `ScriptedPermission: no more decisions (used ${this._index}, had ${this._decisions.length})`,
      )
    }
    return this._decisions[this._index++]!
  }

  /** Cuántas decisiones se han entregado. */
  get consumed(): number {
    return this._index
  }

  /** Vuelve al principio para repetir el guion. */
  reset(): void {
    this._index = 0
  }
}

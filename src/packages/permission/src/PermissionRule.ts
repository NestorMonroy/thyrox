/**
 * Los tipos de una regla de permiso y sus dos esquemas.
 *
 * Procedencia: `ccnmt: packages/permission/src/PermissionRule.ts` (26 líneas,
 * 6 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** y no se copia.
 *
 * CIERRE DEL PORTE. El tramo anterior traía 4 de los 6 y declaraba su recorte
 * con este bloqueo: *«`zod` no está en las dependencias de
 * `@thyrox/permission/package.json` ni linkeado en su `node_modules` — añadirlo
 * exige `bun install` … otros dos agentes tienen el lockfile en vuelo ahora
 * mismo»*. Ese aviso nombraba su propia caducidad, y hoy no se sostiene:
 * medido, `import { z } from 'zod/v4'` resuelve desde este paquete. El aviso
 * SE RETIRA en vez de dejarlo pudrirse — un bloqueo caducado que nadie borra
 * se lee como vigente, y quien llegue lo vuelve a rodear.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { z } from 'zod/v4'
import { lazySchema } from '../internal/lazySchema.js'

export type {
  PermissionBehavior,
  PermissionRule,
  PermissionRuleSource,
  PermissionRuleValue,
} from './permissionTypes.js'

/**
 * Los tres comportamientos, y sólo esos.
 *
 * La lista es CERRADA a propósito: un comportamiento desconocido que pasara la
 * validación se leería aguas abajo como «no denegar», que es lo contrario de
 * fail-closed.
 */
export const permissionBehaviorSchema = lazySchema(() =>
  z.enum(['allow', 'deny', 'ask']),
)

/**
 * El valor de una regla: la herramienta que gobierna y, opcionalmente, el
 * recorte dentro de ella.
 *
 * El nombre de herramienta es OBLIGATORIO: una regla sin sujeto no acota nada,
 * así que aceptarla equivaldría a una regla que aplica a todo.
 */
export const permissionRuleValueSchema = lazySchema(() =>
  z.object({
    toolName: z.string(),
    ruleContent: z.string().optional(),
  }),
)

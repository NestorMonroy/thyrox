/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/permission/src/PermissionRule.ts`
 * (26 líneas, 6 exports, licencia UNLICENSED — reimplementación, no copia).
 *
 * PORTADOS (4 de 6) — el re-export de tipos, consumido por
 * `shadowedRuleDetection.ts` y `PermissionUpdate.ts` de este mismo pase:
 *
 *   `PermissionBehavior` · `PermissionRule` · `PermissionRuleSource` ·
 *   `PermissionRuleValue`
 *
 * OMITIDOS (2 de 6), declarados por nombre y bloqueo:
 *
 *   - `permissionBehaviorSchema` (`PermissionRule.ts:18-20`) — `z.enum(...)`
 *     envuelto en `lazySchema`. Bloqueado: `zod` no está en las
 *     dependencias de `@thyrox/permission/package.json` ni linkeado en su
 *     `node_modules` — añadirlo exige `bun install`, que reescribe
 *     `bun.lock` (fuera de alcance de este pase: otros dos agentes tienen
 *     `src/packages/package.json`/`bun.lock` en vuelo ahora mismo).
 *   - `permissionRuleValueSchema` (`PermissionRule.ts:22-27`) — mismo
 *     bloqueo (`z.object(...)`).
 *
 * Sin divergencias en lo portado: los cuatro tipos son alias directos a
 * `./permissionTypes.js`, ya presentes ahí con la misma forma.
 */
export type {
  PermissionBehavior,
  PermissionRule,
  PermissionRuleSource,
  PermissionRuleValue,
} from './permissionTypes.js'

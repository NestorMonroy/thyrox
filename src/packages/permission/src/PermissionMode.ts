/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/permission/src/PermissionMode.ts`
 * (139 líneas, 13 exports, licencia UNLICENSED — reimplementación, no
 * copia). Consumidor real cross-package confirmado:
 * `@thyrox/bridge/bridgeMessaging.ts` declara HOY un tipo estructural
 * propio de `PermissionMode` en `internal/pendingCrossPackageDeps.ts`
 * porque, cita textual de su docstring, "`@thyrox/permission` aún no
 * porta `PermissionMode.ts`" — este archivo cierra esa espera (el punto de
 * inyección de `bridge` sigue vivo hasta que ese paquete lo reapunte; no
 * es parte de este pase, que trabaja sólo dentro de `permission/`).
 *
 * PORTE CERRADO — los 13 de 13. El tramo anterior traía 11 y declaraba los
 * dos esquemas omitidos con este bloqueo: *«`zod` no está en las dependencias
 * de este paquete ni linkeado en su `node_modules` — añadirlo exige
 * `bun install` … otros dos agentes tienen el lockfile en vuelo»*. Ese aviso
 * nombraba su propia caducidad y hoy no se sostiene: medido,
 * `import { z } from 'zod/v4'` resuelve desde este paquete. **Se retira en vez
 * de dejarlo pudrirse** — un bloqueo caducado que nadie borra se lee como
 * vigente, y quien llegue lo vuelve a rodear en lugar de medirlo.
 *
 *   `EXTERNAL_PERMISSION_MODES` · `PERMISSION_MODES` ·
 *   `ExternalPermissionMode` · `PermissionMode` (los 4 re-exportados desde
 *   `./permissionTypes.js`) · `isExternalPermissionMode` ·
 *   `toExternalPermissionMode` · `permissionModeFromString` ·
 *   `permissionModeTitle` · `isDefaultMode` · `permissionModeShortTitle` ·
 *   `permissionModeSymbol` · `getModeColor` · `permissionModeSchema` ·
 *   `externalPermissionModeSchema`
 *
 * Divergencia medida: la fuente importa `readEnv` de
 * `@claude-code-how-works/config/env` y nunca lo usa —
 * `grep -n "readEnv(" PermissionMode.ts` da 0 resultados sobre el import en
 * la línea 11. Import muerto en la propia fuente; se omite aquí sin
 * pérdida de comportamiento.
 */
import { feature } from 'bun:bundle'
import { z } from 'zod/v4'
import { lazySchema } from '../internal/lazySchema.js'
import {
  EXTERNAL_PERMISSION_MODES,
  type ExternalPermissionMode,
  PERMISSION_MODES,
  type PermissionMode,
} from './permissionTypes.js'

export { EXTERNAL_PERMISSION_MODES, PERMISSION_MODES }
export type { ExternalPermissionMode, PermissionMode }

/**
 * El modo tal como se declara PUERTAS ADENTRO — incluye los que nunca salen
 * al protocolo.
 */
export const permissionModeSchema = lazySchema(() => z.enum(PERMISSION_MODES))

/**
 * El modo tal como puede declararlo un tercero.
 *
 * Es la lista EXTERNA, no la interna, y la diferencia es la que importa: un
 * modo que sólo existe dentro del proceso no debe poder pedirse desde fuera.
 */
export const externalPermissionModeSchema = lazySchema(() =>
  z.enum(EXTERNAL_PERMISSION_MODES),
)

const PAUSE_ICON = '⏸' // ⏸

type ModeColorKey =
  | 'text'
  | 'planMode'
  | 'permission'
  | 'autoAccept'
  | 'error'
  | 'warning'

type PermissionModeConfig = {
  title: string
  shortTitle: string
  symbol: string
  color: ModeColorKey
  external: ExternalPermissionMode
}

const PERMISSION_MODE_CONFIG: Partial<
  Record<PermissionMode, PermissionModeConfig>
> = {
  default: {
    title: 'Manual',
    shortTitle: 'Manual',
    symbol: PAUSE_ICON,
    color: 'text',
    external: 'default',
  },
  plan: {
    title: 'Plan Mode',
    shortTitle: 'Plan',
    symbol: PAUSE_ICON,
    color: 'planMode',
    external: 'plan',
  },
  acceptEdits: {
    title: 'Accept edits',
    shortTitle: 'Accept',
    symbol: '⏵⏵',
    color: 'autoAccept',
    external: 'acceptEdits',
  },
  bypassPermissions: {
    title: 'Bypass Permissions',
    shortTitle: 'Bypass',
    symbol: '⏵⏵',
    color: 'error',
    external: 'bypassPermissions',
  },
  dontAsk: {
    title: "Don't Ask",
    shortTitle: 'DontAsk',
    symbol: '⏵⏵',
    color: 'error',
    external: 'dontAsk',
  },
  ...(feature('TRANSCRIPT_CLASSIFIER')
    ? {
        auto: {
          title: 'Auto mode',
          shortTitle: 'Auto',
          symbol: '⏵⏵',
          color: 'warning' as ModeColorKey,
          external: 'default' as ExternalPermissionMode,
        },
      }
    : {}),
}

export function isExternalPermissionMode(
  mode: PermissionMode,
): mode is ExternalPermissionMode {
  // 'auto' y 'bubble' son modos internos — SÍ son direccionables por el
  // usuario (seleccionables desde el picker /config, --permission-mode,
  // defaultMode en settings) pero no hacen round-trip por el conjunto
  // EXTERNAL que usan las superficies de protocolo SDK/IDE. Devolver true
  // aquí haría que un `onChange` mapeara 'auto' → toExternal → 'default'
  // antes de guardar, descartando en silencio la selección del usuario.
  return mode !== 'auto' && mode !== 'bubble'
}

function getModeConfig(mode: PermissionMode): PermissionModeConfig {
  return PERMISSION_MODE_CONFIG[mode] ?? PERMISSION_MODE_CONFIG.default!
}

export function toExternalPermissionMode(
  mode: PermissionMode,
): ExternalPermissionMode {
  return getModeConfig(mode).external
}

export function permissionModeFromString(str: string): PermissionMode {
  if (str === 'manual') return 'default'
  return (PERMISSION_MODES as readonly string[]).includes(str)
    ? (str as PermissionMode)
    : 'default'
}

export function permissionModeTitle(mode: PermissionMode): string {
  return getModeConfig(mode).title
}

export function isDefaultMode(mode: PermissionMode | undefined): boolean {
  return mode === 'default' || mode === undefined
}

export function permissionModeShortTitle(mode: PermissionMode): string {
  return getModeConfig(mode).shortTitle
}

export function permissionModeSymbol(mode: PermissionMode): string {
  return getModeConfig(mode).symbol
}

export function getModeColor(mode: PermissionMode): ModeColorKey {
  return getModeConfig(mode).color
}

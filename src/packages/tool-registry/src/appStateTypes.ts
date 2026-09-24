// Puerto FIEL y COMPLETO de
// `ccnmt: packages/tool-registry/src/appStateTypes.ts` (TASK #232).
//
// V7 §7.2 — shim de solo-tipo para que tool-registry no importe
// src/state/AppState. La forma concreta es opaca aquí; las firmas de
// Tool/Task sólo la enhebran.
//
// Tipado como `Record<string, any>` en vez de `unknown` para que los
// consumidores puedan:
//   - esparcir el estado en objetos nuevos: `{ ...prev, foo: 1 }` (era TS2698)
//   - acceder a propiedades arbitrarias: `prev.someField` (era TS2339 sobre unknown)
// Ambos son legítimos en la frontera V7 porque la forma canónica vive en
// app-host/state — tool-registry sólo enhebra el valor.
// Corregido 2026-09-24: la frontera V7 ya no aplica aquí — tool-registry
// declara `@thyrox/app-host` como dependencia. Un `Record` propio divergía del
// `AppState` canónico (le faltaba `tasks`), y cada `SetAppState` de este paquete
// quedaba incompatible con los de agent, swarm y config. Se reexporta el tipo
// canónico: es `import type`, así que no añade arista de runtime.
export type { AppState } from '@thyrox/app-host/state/AppState.js'

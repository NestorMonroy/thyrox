// Puerto de `ccnmt: packages/tool-registry/src/appStateTypes.ts` (TASK #232).
//
// La fuente declara aquí un shim de solo-tipo (`Record<string, any>`, V7
// §7.2) para no importar el estado de la aplicación. Este paquete declara
// `@thyrox/app-host` como dependencia, así que reexporta el `AppState`
// canónico: un `Record` propio divergiría de él y cada `SetAppState` de este
// paquete sería incompatible con los de agent, swarm y config. Es
// `import type`, así que no añade arista de runtime.
export type { AppState } from '@thyrox/app-host/state/AppState.js'

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppState = Record<string, any>

/**
 * Adaptación de `ccnmt: packages/app-host/src/context/fpsMetrics.tsx`.
 * Capa 0 (sin cita a paquete hermano ausente) — porte verbatim, sin
 * divergencias. `FpsMetrics` se importa `type`-only desde
 * `@thyrox/output/fpsTracker.js` — el tipo existe y se exporta ahí
 * (`@thyrox/output: src/fpsTracker.ts:7`); al ser `import type` se borra
 * al transpilar, así que no exige que `@thyrox/output` esté declarado
 * como dependencia de `@thyrox/app-host` (hoy no lo está — ver el
 * `package.json` de este paquete; añadirlo es la única corrección
 * pendiente, y no bloquea este archivo).
 */
import React, { createContext, useContext } from 'react'
import type { FpsMetrics } from '@thyrox/output/fpsTracker.js'

type FpsMetricsGetter = () => FpsMetrics | undefined

const FpsMetricsContext = createContext<FpsMetricsGetter | undefined>(undefined)

type Props = {
  getFpsMetrics: FpsMetricsGetter
  children: React.ReactNode
}

export function FpsMetricsProvider({
  getFpsMetrics,
  children,
}: Props): React.ReactNode {
  return (
    <FpsMetricsContext.Provider value={getFpsMetrics}>
      {children}
    </FpsMetricsContext.Provider>
  )
}

export function useFpsMetrics(): FpsMetricsGetter | undefined {
  return useContext(FpsMetricsContext)
}

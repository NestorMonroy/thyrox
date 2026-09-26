import React from 'react'
import type { Root } from '@anthropic/ink'
import type { InteractiveHostSession } from './index.js'
import type { AppState } from './state/AppStateCompat.js'
import type { StatsStore } from './context/stats.js'
import type { FpsMetrics } from '@thyrox/output/fpsTracker.js'
import type { Props as REPLProps } from '@thyrox/repl/screens/REPL.js'

export type AppWrapperProps<TState, TStats, TFpsMetrics> = {
  getFpsMetrics: () => TFpsMetrics | undefined
  stats?: TStats
  initialState: TState
}

export type LaunchReplArgs<TState, TStats, TFpsMetrics> = {
  root: Root
  session: InteractiveHostSession<TState>
  appProps: AppWrapperProps<TState, TStats, TFpsMetrics>
  replProps: REPLProps
  renderAndRun: (root: Root, element: React.ReactNode) => Promise<void>
}

// El estado no es genérico: `App` sólo acepta un store de `AppState`, y un
// `TState` libre no le es asignable ni con `extends AppState` —`setState`
// recibe un callback, que compara en sentido contrario—. Tampoco lo son las
// métricas: `App` exige `StatsStore` y `FpsMetrics` concretos.
export async function launchRepl({
  root,
  session,
  appProps,
  replProps,
  renderAndRun,
}: LaunchReplArgs<AppState, StatsStore, FpsMetrics>): Promise<void> {
  const { App } = await import('@thyrox/repl/components/App.js')
  const { REPL } = await import('@thyrox/repl/screens/REPL.js')

  await renderAndRun(
    root,
    <App {...appProps} store={session.store}>
      <REPL
        {...replProps}
        runtimeGraph={session.runtimeGraph}
      />
    </App>,
  )
}

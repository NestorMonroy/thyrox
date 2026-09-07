/**
 * Adaptación de `ccnmt: packages/app-host/src/launchRepl.tsx`.
 * Capa 1 tramo B — porte FIEL de la estructura; sin stub para lo que
 * está ausente.
 *
 * Los cuatro imports de tipo (`Root` de `@anthropic/ink`,
 * `InteractiveHostSession` de `./index.js`, `REPLProps` de
 * `@claude-code-how-works/repl/screens/REPL.js`) son `type`-only — se
 * borran al transpilar (verificado empíricamente: un import `type` a un
 * especificador irresoluble no rompe `bun test`), así que el módulo
 * CARGA sin necesitar que `@anthropic/ink` ni `repl` existan en este
 * árbol.
 *
 * Lo que SÍ rompería si se invocara: los dos `await import(...)`
 * dentro de `launchRepl` apuntan a `@claude-code-how-works/repl/...`.
 * `repl` no existe en absoluto en este árbol — medido:
 * `ls /home/user/thyrox/src/packages/ | grep repl` → vacío, mismo
 * hallazgo que `state/store.ts` y `state/selectors.ts` ya documentan.
 * Se conservan literales, sin traducir y sin stub — mismo criterio que
 * `runtime/installNativeStdinReader.ts` (hermano de este paquete): son
 * imports DINÁMICOS, no estáticos, así que difieren la resolución hasta
 * que la función se invoque — el módulo entero no queda bloqueado por
 * su ausencia, sólo la ejecución de `launchRepl` lo estaría. Sin test:
 * ejercitar `launchRepl` exigiría los dos módulos de `repl` que no
 * existen. Bloqueo declarado, no fabricado.
 */
import React from 'react'
import type { Root } from '@anthropic/ink'
import type { InteractiveHostSession } from './index.js'
import type { Props as REPLProps } from '@claude-code-how-works/repl/screens/REPL.js'

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

export async function launchRepl<TState, TStats, TFpsMetrics>({
  root,
  session,
  appProps,
  replProps,
  renderAndRun,
}: LaunchReplArgs<TState, TStats, TFpsMetrics>): Promise<void> {
  const { App } = await import('@claude-code-how-works/repl/components/App.js')
  const { REPL } = await import('@claude-code-how-works/repl/screens/REPL.js')

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

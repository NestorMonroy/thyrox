// These side-effects must run before all other imports:
// 1. profileCheckpoint marks entry before heavy module evaluation begins
// 2. startMdmRawRead fires MDM subprocesses (plutil/reg query) so they run in
//    parallel with the remaining ~135ms of imports below
// 3. startKeychainPrefetch fires both macOS keychain reads (OAuth + legacy API
//    key) in parallel — isRemoteManagedSettingsEligible() otherwise reads them
//    sequentially via sync spawn inside applySafeConfigEnvironmentVariables()
//    (~65ms on every macOS startup)
import { profileCheckpoint } from "@thyrox/app-host/startup/startupProfiler.js";

// eslint-disable-next-line custom-rules/no-top-level-side-effects
profileCheckpoint("main_tsx_entry");

import { startMdmRawRead } from "@thyrox/config/settings/mdm/rawRead";

// eslint-disable-next-line custom-rules/no-top-level-side-effects
startMdmRawRead();

import { startKeychainPrefetch } from "../secureStorage/keychainPrefetch.js";

// eslint-disable-next-line custom-rules/no-top-level-side-effects
startKeychainPrefetch();

import '@thyrox/app-host/runtime/bootstrap.js'

import { enableConfigs, getGlobalConfig, saveGlobalConfig } from '@thyrox/config'
import { installConfigHostBindings } from '@thyrox/config/host.js'
import { setThemeConfigCallbacks, THEME_SETTINGS, type ThemeSetting } from '@anthropic/ink'
import { runCli } from './run-cli.ts'
import { EXIT_USAGE } from '../exitCodes.ts'
import { startDeferredPrefetches } from '@thyrox/app-host/main/startup/context.js'

export { startDeferredPrefetches };

// eslint-disable-next-line custom-rules/no-top-level-side-effects
profileCheckpoint("main_tsx_imports_loaded");

function isThemeSetting(value: string): value is ThemeSetting {
  return (THEME_SETTINGS as readonly string[]).includes(value)
}

// Wire up theme config persistence into @anthropic/ink's ThemeProvider.
// eslint-disable-next-line custom-rules/no-top-level-side-effects
setThemeConfigCallbacks({
  loadTheme: () => {
    try {
      const theme = getGlobalConfig().theme
      return isThemeSetting(theme) ? theme : 'dark'
    } catch {
      // ThemeProvider mounts before enableConfigs() in interactive startup.
      // Fall back to a safe default for first render, then later reads use config.
      return 'dark'
    }
  },
  saveTheme: setting => {
    try {
      saveGlobalConfig(c => ({ ...c, theme: setting }))
    } catch {
      // Ignore pre-config startup writes; interactive settings saves happen
      // after enableConfigs() and will persist normally.
    }
  },
})

/**
 * La capa `main` del binario (`chunk-8qx3adam.js` en 2.1.282): `entry/cli.tsx`
 * despacha los caminos rapidos y termina importando este modulo y llamando a
 * `main()`.
 *
 * DIVERGENCIA DECLARADA: la referencia termina en
 * `runClaudeCode(createRuntimeHandles())` —el arbol de Commander y el REPL—.
 * Aqui `main()` despacha con `runCli`, el despachador de thyrox que antes
 * vivia en `entry/main.ts` bajo el nombre de esta capa (y chocaba con este
 * archivo al emitir, TS5056). Medido al cablearlo: por el camino de la
 * referencia, `cli.tsx` sin argumentos abre el REPL interactivo y espera sin
 * TTY; `runCli` imprime el uso y sale. `runClaudeCode` sigue en
 * `entry/run-cli.ts`, sin cablear, hasta que el REPL corra aqui.
 * Banco: .claude/workbench/entry-point-<fecha>/README.md.
 *
 * `process.exit` y no `exitCode`: los efectos de arranque de este modulo
 * (prefetch del llavero, temporizadores) dejan manejadores abiertos, y sin la
 * salida forzada el proceso no termina — la misma razon que `main.ts` tenia.
 */
export async function main(): Promise<void> {
  installConfigHostBindings({})
  enableConfigs()
  try {
    process.exit(await runCli(process.argv.slice(2)))
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    process.exit(EXIT_USAGE)
  }
}

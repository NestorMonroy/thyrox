// Canonical owner is @thyrox/config/remote.
export type * from '@thyrox/config/remote'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { clearRemoteManagedSettingsCache, computeChecksumFromSettings, initializeRemoteManagedSettingsLoadingPromise, isEligibleForRemoteManagedSettings, loadRemoteManagedSettings, refreshRemoteManagedSettings, startBackgroundPolling, stopBackgroundPolling, waitForRemoteManagedSettingsToLoad } from '@thyrox/config/remote'

/**
 * Instalador nativo - API pública
 *
 * Archivo barrel que exporta solo las funciones usadas por consumidores
 * externos.
 *
 * Puerto de `ccnmt: packages/updater/src/nativeInstaller/index.ts`
 * (17 líneas fuente, 100% portado).
 */
export {
  checkInstall,
  cleanupNpmInstallations,
  cleanupOldVersions,
  cleanupShellAliases,
  installLatest,
  lockCurrentVersion,
  removeInstalledSymlink,
  type SetupMessage,
} from './installer.js'

export { getLatestVersion } from './download.js'

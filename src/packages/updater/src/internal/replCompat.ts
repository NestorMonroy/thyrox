/**
 * Sustituto local de dos símbolos que `nativeInstaller/installer.ts`
 * consume de `@claude-code-how-works/repl` — un paquete ENTERO ausente
 * en este árbol (medido: `ls src/packages | grep repl` → 0; ningún
 * alias de `@thyrox/repl` resuelve). Es distinto de los demás sustitutos
 * de este agente: no es un archivo puntual sin portar dentro de un
 * paquete que sí existe, es un paquete completo — con su propia
 * dependencia de `execa`, `SandboxManager`, `tool-registry/ripgrep.js`,
 * etc. Reimplementarlo aquí sería adoptar el dominio entero de `repl`,
 * fuera de las rutas de este agente.
 *
 *   - `getShellType()` — `ccnmt: packages/repl/src/localInstaller.ts:156-162`.
 *     Trivial, autocontenida, sin dependencias — se porta LOCAL Y
 *     COMPLETA (no un stub): mismo cuerpo verbatim.
 *   - `getCurrentInstallationType()` — `ccnmt: packages/repl/src/doctorDiagnostic.ts:90-149`.
 *     Depende de `execa`, `isInBundledMode`, `isRunningFromLocalInstallation`,
 *     y de más de una docena de imports ajenos al alcance de este
 *     agente. Se resuelve con `require()` diferido; si el paquete no
 *     existe, el fallback es `'unknown'` — el mismo valor que la fuente
 *     ya devuelve cuando no puede determinar el tipo de instalación
 *     (ver el `return 'unknown'` al final de su propio cuerpo), así que
 *     es el default correcto, no uno inventado.
 */

export function getShellType(): string {
  const shellPath = process.env.SHELL || ''
  if (shellPath.includes('zsh')) return 'zsh'
  if (shellPath.includes('bash')) return 'bash'
  if (shellPath.includes('fish')) return 'fish'
  return 'unknown'
}

export type InstallationType =
  | 'npm-global'
  | 'npm-local'
  | 'native'
  | 'package-manager'
  | 'development'
  | 'unknown'

export async function getCurrentInstallationType(): Promise<InstallationType> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const repl = require('@thyrox/repl/doctorDiagnostic.js') as {
      getCurrentInstallationType: () => Promise<InstallationType>
    }
    return await repl.getCurrentInstallationType()
  } catch {
    return 'unknown'
  }
}

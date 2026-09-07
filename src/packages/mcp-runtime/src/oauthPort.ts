/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/oauthPort.ts` — sus 2
 * exportaciones, ninguna omitida.
 *
 * `getPlatform` NO se reapunta a `@claude-code-how-works/config/platform`
 * ni se deja como especificador colgante: a diferencia de la mayoría de
 * los imports cruzados de este porte, éste se EJECUTA al cargar el
 * módulo (`REDIRECT_PORT_RANGE` se calcula a nivel de módulo, no dentro
 * de una función) — dejarlo sin resolver rompe la carga del archivo
 * entero, no sólo una rama no ejercitada por los tests. `@thyrox/config`
 * tampoco declara `./platform` en su `exports` (sólo `.`, `./types`,
 * `./constants`, `./validation`, `./load`, `./env/utils`), así que no hay
 * a dónde reapuntar todavía.
 *
 * Se reimplementa un sustituto local mínimo, MISMO patrón y MISMO cuerpo
 * que ya usa `@thyrox/storage: src/internal/pendingCrossPackageDeps.ts`
 * para el mismo símbolo — no se importa de ahí porque ese archivo no está
 * exportado en el `package.json` de `@thyrox/storage` (es un detalle
 * interno de esa fuente, no una API de paquete). Distingue sólo
 * `macos`/`windows`/`linux` por `process.platform` (wsl colapsa a
 * `linux`, igual que en `storage`); ningún test de este porte ejercita la
 * rama wsl de la fuente original.
 *
 * Helpers del puerto de redirección OAuth — extraídos de `auth.ts` para
 * romper la dependencia circular `auth.ts` ↔ `xaaIdpLogin.ts`.
 */
import { createServer } from 'http'

function getPlatform(): 'macos' | 'windows' | 'linux' | 'unknown' {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'linux') return 'linux'
  return 'unknown'
}

// El rango dinámico de puertos de Windows 49152-65535 está reservado.
const REDIRECT_PORT_RANGE =
  getPlatform() === 'windows'
    ? { min: 39152, max: 49151 }
    : { min: 49152, max: 65535 }
const REDIRECT_PORT_FALLBACK = 3118

/**
 * Construye una URI de redirección en localhost con el puerto dado y una
 * ruta fija `/callback`.
 *
 * RFC 8252 sección 7.3 (OAuth para apps nativas): las URIs de redirección
 * loopback coinciden con cualquier puerto siempre que la ruta coincida.
 */
export function buildRedirectUri(
  port: number = REDIRECT_PORT_FALLBACK,
): string {
  return `http://localhost:${port}/callback`
}

function getMcpOAuthCallbackPort(): number | undefined {
  const port = parseInt(process.env.MCP_OAUTH_CALLBACK_PORT || '', 10)
  return port > 0 ? port : undefined
}

/**
 * Busca un puerto disponible en el rango especificado para la
 * redirección OAuth. Usa selección aleatoria por seguridad.
 */
export async function findAvailablePort(): Promise<number> {
  // Primero intenta el puerto configurado, si se especificó.
  const configuredPort = getMcpOAuthCallbackPort()
  if (configuredPort) {
    return configuredPort
  }

  const { min, max } = REDIRECT_PORT_RANGE
  const range = max - min + 1
  const maxAttempts = Math.min(range, 100) // No intentar por siempre.

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = min + Math.floor(Math.random() * range)

    try {
      await new Promise<void>((resolve, reject) => {
        const testServer = createServer()
        testServer.once('error', reject)
        testServer.listen(port, () => {
          testServer.close(() => resolve())
        })
      })
      return port
    } catch {
      // Puerto ya en uso; se intenta el siguiente pick aleatorio / el
      // fallback de abajo.
    }
  }

  // Si la selección aleatoria falló, intenta el puerto de fallback.
  try {
    await new Promise<void>((resolve, reject) => {
      const testServer = createServer()
      testServer.once('error', reject)
      testServer.listen(REDIRECT_PORT_FALLBACK, () => {
        testServer.close(() => resolve())
      })
    })
    return REDIRECT_PORT_FALLBACK
  } catch {
    throw new Error(`No available ports for OAuth redirect`)
  }
}

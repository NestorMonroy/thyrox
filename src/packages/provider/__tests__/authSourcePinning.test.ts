/**
 * Los invariantes de `auth.ts` pinchados sobre su FUENTE — porte del
 * instrumento de `ccnmt: src/__tests__/anthropicAuthProvider.behavior.test.ts`.
 *
 * POR QUÉ ESTE INSTRUMENTO ADEMÁS DEL DE CONDUCTA. `authProviders.test.ts`
 * llama a `getCredentials` con bindings sembrados y lee lo que sale; eso mide
 * el significado y es el control fuerte. Pero **no puede ver un invariante que
 * el refactor conserva en el camino sembrado y suelta en el resto**: si
 * alguien cambia `context?.apiKeyOverride || auth.getAnthropicApiKey()` por
 * sólo el segundo término, el caso de conducta que pasa un override falla —
 * pero si el refactor además reordena y el stub devuelve lo mismo por las dos
 * vías, no falla nada. Pinchar la fuente cierra ese hueco: el invariante
 * tiene que estar ESCRITO, no sólo dar el resultado hoy.
 *
 * Son dos ejes distintos y ninguno sustituye al otro. La referencia sólo tiene
 * éste; nosotros tenemos los dos porque el nuestro es un puerto y el eje de
 * conducta es lo que prueba que el puerto hace lo mismo, no sólo que se
 * parece.
 *
 * Los patrones se adaptan a NUESTRA redacción —el puerto es reimplementación
 * bajo UNLICENSED, no copia— pero pinchan los mismos siete invariantes que la
 * fuente pincha, uno a uno.
 *
 * CONTROL DE ANULACIÓN, medido: quitando ` || null` del cálculo de `apiKey`
 * —un cambio que la suite de conducta NO ve, porque el stub nunca devuelve
 * `undefined`— cae **1 de 8**: el caso 2. Es exactamente el hueco que este
 * instrumento existe para cubrir.
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fuente = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'auth.ts'),
  'utf-8',
)

describe('invariantes escritos en auth.ts', () => {
  test('1. refresh() llama a checkAndRefreshOAuthTokenIfNeeded', () => {
    expect(fuente).toMatch(
      /async refresh\(\): Promise<void> \{[\s\S]*?await getProviderHostBindings\(\)\.auth\.checkAndRefreshOAuthTokenIfNeeded\(\)/,
    )
  })

  test('2. CRÍTICO: la exclusión mutua está escrita, no sólo se cumple hoy', () => {
    // Un suscriptor NUNCA recibe apiKey; un no suscriptor NUNCA recibe token.
    expect(fuente).toMatch(
      /const apiKey = subscriber\s*\n?\s*\?\s*null\s*\n?\s*:\s*context\?\.apiKeyOverride \|\| auth\.getAnthropicApiKey\(\) \|\| null/,
    )
    expect(fuente).toMatch(
      /const authToken = subscriber\s*\n?\s*\?\s*auth\.getClaudeAIOAuthTokens\(\)\?\.accessToken \?\? null\s*\n?\s*:\s*null/,
    )
  })

  test('3. el override del contexto va DELANTE de la clave de los bindings', () => {
    expect(fuente).toMatch(/context\?\.apiKeyOverride \|\| auth\.getAnthropicApiKey\(\)/)
  })

  test('4. authorizationHeader: suscriptor null, no suscriptor construido del contexto', () => {
    expect(fuente).toMatch(
      /authorizationHeader:\s*subscriber\s*\n?\s*\?\s*null\s*\n?\s*:\s*await getAnthropicAuthorizationHeader\(context\)/,
    )
  })

  test('5. el token del entorno va DELANTE del ayudante', () => {
    expect(fuente).toMatch(
      /readEnv\('ANTHROPIC_AUTH_TOKEN'\) \|\|\s*\n?\s*\(await auth\.getApiKeyFromApiKeyHelper\(/,
    )
  })

  test('6. staging exige las DOS condiciones, no una', () => {
    expect(fuente).toMatch(
      /process\.env\.USER_TYPE === 'ant' &&[\s\S]*?USE_STAGING_OAUTH[\s\S]*?baseURL:\s*auth\.getOauthConfig\(\)\.BASE_API_URL/,
    )
  })

  test('7. isAvailable: suscriptor O clave O token', () => {
    expect(fuente).toMatch(
      /if \(creds\.subscriber \|\| creds\.apiKey \|\| creds\.authToken\) \{[\s\S]*?return \{ available: true \}/,
    )
  })

  test('8. la razón nombra las dos vías, con su redacción exacta', () => {
    expect(fuente).toMatch(
      /reason: 'No Anthropic API key or Claude\.ai OAuth token is configured\.'/,
    )
  })
})

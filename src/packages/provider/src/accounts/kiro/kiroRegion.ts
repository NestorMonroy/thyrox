/**
 * Las dos regiones de una cuenta de Kiro (Amazon Q Developer): la del
 * Identity Center, que sólo sirve para acuñar y refrescar el token
 * (`oidc.{región}`), y la del perfil, donde vive el runtime. AWS aloja el
 * perfil sólo en `us-east-1` y `eu-central-1`, sea cual sea la del Identity
 * Center; la región que manda es la que lleva el ARN del perfil.
 *
 * Porte de `omniroute: open-sse/services/kiroRegion.ts` y de
 * `assertValidAwsRegion` de `src/lib/oauth/constants/oauth.ts` (MIT).
 */

/** Forma canónica de una región de AWS: la región se interpola en hosts, y otra forma sería un SSRF. */
export const AWS_REGION_PATTERN = /^[a-z]{2}-[a-z]+-\d{1,2}$/

export const KIRO_PROFILE_REGIONS = ['us-east-1', 'eu-central-1'] as const
const DEFAULT_REGION = 'us-east-1'
const EMEA_REGION = /^(eu|af|me|il)-/
const PROFILE_LOOKUP_TIMEOUT_MS = 10_000
const MAX_PROFILES = 10

export function assertValidAwsRegion(region: string): string {
  if (typeof region !== 'string' || !AWS_REGION_PATTERN.test(region)) throw new Error('Invalid region')
  return region
}

/** `us-east-1` conserva el host heredado de CodeWhisperer; el resto usa el endpoint regional de Amazon Q. */
export function kiroRuntimeHost(region: string): string {
  return region === DEFAULT_REGION ? 'https://codewhisperer.us-east-1.amazonaws.com' : `https://q.${region}.amazonaws.com`
}

export function regionFromKiroProfileArn(profileArn?: string | null): string | undefined {
  return typeof profileArn === 'string' ? profileArn.toLowerCase().match(/^arn:aws:codewhisperer:([a-z0-9-]+):/)?.[1] : undefined
}

function normalizeRegion(region: unknown): string {
  return typeof region === 'string' ? region.trim().toLowerCase() : ''
}

/** El ARN del perfil; si no, la región guardada sólo si es de perfil; si no, `us-east-1`. */
export function resolveKiroRuntimeRegion(data: { region?: unknown; profileArn?: unknown } | null | undefined): string {
  const fromArn = regionFromKiroProfileArn(typeof data?.profileArn === 'string' ? data.profileArn : undefined)
  if (fromArn) return fromArn
  const stored = normalizeRegion(data?.region)
  return (KIRO_PROFILE_REGIONS as readonly string[]).includes(stored) ? stored : DEFAULT_REGION
}

/**
 * Dónde buscar el perfil: primero las regiones de perfil (Europa primero si
 * el Identity Center está en EMEA), después la del Identity Center, por si
 * AWS llega a alojar el perfil ahí.
 */
export function kiroProfileDiscoveryRegions(storedRegion?: string | null): string[] {
  const stored = normalizeRegion(storedRegion)
  const regions = EMEA_REGION.test(stored) ? ['eu-central-1', 'us-east-1'] : ['us-east-1', 'eu-central-1']
  if (stored && AWS_REGION_PATTERN.test(stored) && !regions.includes(stored)) regions.push(stored)
  return regions
}

async function profileArnInRegion(accessToken: string, region: string, fetch: typeof globalThis.fetch): Promise<string | undefined> {
  if (!AWS_REGION_PATTERN.test(region)) return undefined
  try {
    const response = await fetch(`${kiroRuntimeHost(region)}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.0',
        Accept: 'application/json',
        'x-amz-target': 'AmazonCodeWhispererService.ListAvailableProfiles',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ maxResults: MAX_PROFILES }),
      signal: AbortSignal.timeout(PROFILE_LOOKUP_TIMEOUT_MS),
    })
    if (!response.ok) return undefined
    const data = (await response.json()) as { profiles?: unknown }
    const profiles = (Array.isArray(data?.profiles) ? data.profiles : []) as { arn?: unknown }[]
    const matched = profiles.find(profile => typeof profile?.arn === 'string' && regionFromKiroProfileArn(profile.arn) === region) ?? profiles[0]
    return typeof matched?.arn === 'string' && matched.arn.length > 0 ? matched.arn : undefined
  } catch {
    return undefined
  }
}

/**
 * El ARN del primer perfil que aparezca; `undefined` si la cuenta no tiene
 * (una cuenta Builder ID, o sin derecho a Kiro). Nunca lanza.
 */
export async function discoverKiroProfileArn(
  accessToken: string | null | undefined,
  storedRegion?: string | null,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<string | undefined> {
  const token = typeof accessToken === 'string' ? accessToken.trim() : ''
  if (!token) return undefined
  for (const region of kiroProfileDiscoveryRegions(storedRegion)) {
    const arn = await profileArnInRegion(token, region, fetch)
    if (arn) return arn
  }
  return undefined
}

/**
 * Resolvedor local de banderas de característica.
 *
 * Procedencia: `ccnmt: packages/config/feature-flags.ts`. Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** — mismo
 * nombre de módulo, mismo sitio dentro del paquete, mismos nombres y firmas —
 * y no se copia (`porte-completo-no-parcial.md`, «la licencia cambia el
 * mecanismo, nunca la fidelidad»).
 *
 * Qué NO viaja, y por qué: la fuente consulta un cliente de GrowthBook remoto
 * cuando lo hay. Aquí no lo hay ni hace falta — un despliegue self-hosted de un
 * solo operador no tiene panel remoto que consultar — así que la resolución se
 * queda en las tres fuentes locales que la fuente ya contempla, en su misma
 * precedencia:
 *
 *   1. override de entorno (`THYROX_FEATURE_FLAGS`, un objeto JSON);
 *   2. override en proceso (`setGrowthBookConfigOverride`);
 *   3. default declarado en `LOCAL_GATE_DEFAULTS`;
 *   4. el `fallback` que pasa quien llama.
 *
 * El nombre `…_CACHED_MAY_BE_STALE` se conserva aunque aquí nada esté cacheado:
 * es el contrato que los cuatro consumidores portados ya citan, y renombrarlo
 * los obligaría a divergir de la fuente sin ganar nada.
 */

/** Un valor de bandera: lo que la fuente admite declarar. */
export type FeatureValue = boolean | string | number

/** La variable que declara los overrides, como objeto JSON de una línea. */
export const FEATURE_FLAGS_ENV = 'THYROX_FEATURE_FLAGS'

/**
 * Defaults declarados del árbol. Vacío a propósito: una bandera sin entrada
 * aquí resuelve al `fallback` de quien llama, que es lo que hace explícito el
 * comportamiento en el sitio de uso en vez de esconderlo en esta tabla.
 */
const LOCAL_GATE_DEFAULTS: Record<string, FeatureValue> = {}

const configOverrides = new Map<string, FeatureValue>()

function envOverrides(): Record<string, FeatureValue> {
  const raw = process.env[FEATURE_FLAGS_ENV]
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, FeatureValue>
    }
  } catch {
    // Un JSON ilegible NO derriba la lectura: cae al siguiente nivel de la
    // precedencia. Un fallo aquí es de configuración del operador, y dejar sin
    // banderas a todo el proceso sería peor que ignorar la variable.
  }
  return {}
}

function override(name: string): FeatureValue | undefined {
  const desdeEnv = envOverrides()[name]
  if (desdeEnv !== undefined) return desdeEnv
  return configOverrides.get(name)
}

export function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  feature: string,
  fallback?: T,
): T {
  const declarado = override(feature)
  if (declarado !== undefined) return declarado as T
  if (feature in LOCAL_GATE_DEFAULTS) return LOCAL_GATE_DEFAULTS[feature] as T
  return fallback as T
}

/** Aquí no hay refresco que esperar: la resolución ya es local y síncrona. */
export function getFeatureValue_CACHED_WITH_REFRESH<T>(
  feature: string,
  fallback: T,
  _refreshIntervalMs?: number,
): T {
  return getFeatureValue_CACHED_MAY_BE_STALE(feature, fallback)
}

export function checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
  gate: string,
): boolean {
  return Boolean(getFeatureValue_CACHED_MAY_BE_STALE(gate, false))
}

/** ¿La bandera está declarada en el entorno? `false` declarado ES un override. */
export function hasGrowthBookEnvOverride(name: string): boolean {
  return envOverrides()[name] !== undefined
}

export function setGrowthBookConfigOverride(
  name: string,
  value: FeatureValue,
): void {
  configOverrides.set(name, value)
}

export function clearGrowthBookConfigOverrides(): void {
  configOverrides.clear()
}

export function getGrowthBookConfigOverrides(): Record<string, FeatureValue> {
  return Object.fromEntries(configOverrides)
}

export function getAllGrowthBookFeatures(): Record<string, FeatureValue> {
  return { ...LOCAL_GATE_DEFAULTS, ...getGrowthBookConfigOverrides(), ...envOverrides() }
}

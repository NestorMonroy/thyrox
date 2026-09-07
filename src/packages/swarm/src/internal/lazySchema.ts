/**
 * Memoización trivial de una factoría — reimplementación local
 * compartida de `lazySchema` (`ccnmt: adapters/appRuntime.ts`, que a su
 * vez la enruta a un binding de host). El mismo patrón vive ya, portado
 * de forma independiente, en `api: agent/internalUtils.ts:114-117` —
 * aquí se declara una única vez dentro de este paquete en vez de
 * repetirla en cada archivo que la necesita (`mailbox/protocolMessages.ts`,
 * `core/teamHelpers.ts`).
 */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

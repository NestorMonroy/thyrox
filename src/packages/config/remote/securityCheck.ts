/**
 * Puerto de `ccnmt: packages/config/remote/securityCheck.jsx` — dos
 * funciones triviales, cero dependencias. No es uno de los 15 del alcance,
 * pero `remote/index.ts` lo necesita como import estático de su propia
 * capa: se porta en el sitio. Extensión `.ts`, no `.jsx` — la fuente lleva
 * JSX porque en `ccnmt` el binding real (instalado por el host) renderiza
 * un diálogo Ink; aquí sólo se porta el stub de config (los dos defaults
 * "sin diálogo instalado" de la fuente), sin JSX propio.
 *
 * El chequeo de seguridad real —el diálogo interactivo que compara
 * settings viejos vs. nuevos y pide confirmación al usuario— vive en la
 * capa host (`ConfigHostBindings.checkManagedSettingsSecurity` /
 * `.handleSecurityCheckResult`, ver `../contracts.ts`), no en config. Estas
 * dos funciones son el fallback que `remote/index.ts` usa si el host no las
 * instaló: aprueba sin preguntar.
 *
 * La fuente (`.jsx`, sin tipos) declara ambas funciones con CERO
 * parámetros aunque `remote/index.ts` las invoque con argumentos — JS
 * tolera argumentos de más sin fallar. Portado a TypeScript estricto, las
 * firmas aceptan explícitamente (y descartan) esos argumentos para
 * preservar la misma tolerancia sin introducir un error de tipos que la
 * fuente nunca tuvo.
 */
export function checkManagedSettingsSecurity(
  _cachedSettings?: unknown,
  _newSettings?: unknown,
): Promise<{ ok: boolean }> {
  return Promise.resolve({ ok: true })
}

export function handleSecurityCheckResult(_result?: unknown): boolean {
  return true
}

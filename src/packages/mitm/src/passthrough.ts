/**
 * Qué hosts pasan por el MITM en un túnel, sin descifrar TLS. El orden es:
 * exclusión > destino conocido > paso directo.
 *
 * Porte de `omniroute: src/mitm/passthrough.ts` (MIT), que a su vez sigue el
 * `ignore_hosts` de llm-interceptor.
 */

/**
 * Hosts que NUNCA se descifran: bancos, sitios de gobierno y proveedores de
 * inicio de sesión corporativo.
 */
export const DEFAULT_BYPASS_PATTERNS: RegExp[] = [
  /\.bank\./i,
  /(^|\.)gov(\.|$)/i,
  /(^|\.)okta\.com$/i,
  /(^|\.)auth0\.com$/i,
];

/**
 * ¿El host coincide con un patrón glob simple? Sólo `*` es comodín (ni `**` ni
 * `?`). Sin RegExp, para que un patrón del usuario no provoque ReDoS: se parte
 * por `*` y se comprueba, en tiempo lineal, que cada tramo aparece en orden en
 * el host en minúsculas.
 */
export function globMatch(hostname: string, pattern: string): boolean {
  // Más de 8 comodines se rechaza, para acotar el coste.
  const segments = pattern.toLowerCase().split("*");
  if (segments.length > 9) return false;

  const h = hostname.toLowerCase();

  // Sin comodín: igualdad exacta.
  if (segments.length === 1) return h === segments[0];

  // Empieza por el primer tramo, si no está vacío.
  const first = segments[0];
  if (first && !h.startsWith(first)) return false;

  // Termina por el último tramo, si no está vacío.
  const last = segments[segments.length - 1];
  if (last && !h.endsWith(last)) return false;

  // Cada tramo intermedio aparece después de la coincidencia anterior.
  let pos = first.length;
  for (let i = 1; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (seg === "") continue; // consecutive wildcards — skip
    const idx = h.indexOf(seg, pos);
    if (idx === -1) return false;
    pos = idx + seg.length;
  }

  // El último tramo no se solapa con los intermedios.
  if (last) {
    const minEnd = pos + last.length;
    if (minEnd > h.length) return false;
  }

  return true;
}

/**
 * ¿El host se excluye (pasa en túnel sin descifrar)?
 *
 * @param hostname - El host de destino (el SNI o la cabecera `Host`).
 * @param userBypass - Los patrones glob del usuario.
 * @returns `true` si pasa sin inspección.
 */
export function shouldBypass(hostname: string, userBypass: string[]): boolean {
  // Los patrones por defecto van primero.
  if (DEFAULT_BYPASS_PATTERNS.some((re) => re.test(hostname))) return true;

  // Después, los globs del usuario.
  return userBypass.some((p) => globMatch(hostname, p));
}

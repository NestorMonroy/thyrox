/** La raíz de las rutas del inspector de tráfico en la API local. */
export const INSPECTOR_BASE = '/api/tools/traffic-inspector'

export function inspectorPath(route: string): string {
  return `${INSPECTOR_BASE}${route}`
}

/**
 * Puerto de `ccnmt: packages/config/utils/expandTilde.ts` (20 líneas
 * fuente). No es uno de los 15 del alcance — es la dependencia de hoja que
 * `plugin/_deps.ts` necesita como import estático de su propia capa
 * («wave-1», sin ciclo): sin dependencias propias salvo `os` (built-in), se
 * porta en el sitio en vez de bloquearse.
 *
 * Expande el `~` inicial de una ruta al directorio home del usuario. Nota:
 * la expansión `~usuario` no se soporta, por razones de seguridad.
 */
import { homedir } from 'os'

export function expandTilde(path: string): string {
  if (
    path === '~' ||
    path.startsWith('~/') ||
    (process.platform === 'win32' && path.startsWith('~\\'))
  ) {
    return homedir() + path.slice(1)
  }
  return path
}

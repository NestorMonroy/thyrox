/**
 * Reconocer la colisión de locks de Podman (TASK-THYROX-0695, H-THYROX-296).
 *
 * Podman guarda en su base el número de lock de cada objeto y los locks en
 * memoria compartida. Reiniciar el contenedor de la sesión borra la memoria y
 * conserva la base, así que un objeto nuevo puede recibir el número de uno
 * anterior: `podman run` sale 126 y `podman start` escribe el literal de abajo.
 *
 * Este módulo sólo clasifica y redacta el remedio. No renumera: `podman
 * system renumber` exige que no corra otro proceso de Podman y afectaría a los
 * workers vivos. La prevención vive en `infrastructure_ensure`, que mide el
 * desfase al arrancar y renumera sólo sin contenedores vivos (H-THYROX-302).
 */

/** Literal exacto que escribe Podman 4.9.3 (presente en su binario, medido el 2026-09-30). */
export const PODMAN_LOCK_COLLISION_LITERAL = 'deadlock due to lock mismatch'

/** Comando que reasigna los locks; sólo es seguro con Podman parado. */
export const PODMAN_RENUMBER_COMMAND = 'podman system renumber'

/**
 * Lo que escribe Podman 4.9.3 al retirar un objeto cuyo lock no está en la
 * memoria compartida (`podman volume rm`, 2026-10-01): la misma causa vista
 * desde el borrado.
 */
export const PODMAN_LOCK_RELEASE_LITERAL = 'freeing lock for'

/** ¿El stderr de Podman declara una colisión de locks? */
export function isLockCollision(stderr: string): boolean {
  return stderr.includes(PODMAN_LOCK_COLLISION_LITERAL) || stderr.includes(PODMAN_LOCK_RELEASE_LITERAL)
}

/** Texto del remedio para `subject`, el objeto cuyo lock colisionó. */
export function lockCollisionRemedy(subject: string): string {
  return (
    `colisión de locks de Podman sobre ${subject}: retirar el objeto anterior que comparte su lock, ` +
    `o ejecutar \`${PODMAN_RENUMBER_COMMAND}\` sin ningún otro proceso de Podman en marcha`
  )
}

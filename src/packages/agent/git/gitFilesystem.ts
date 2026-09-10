/**
 * Porte COMPLETO de `ccnmt: packages/agent/git/gitFilesystem.ts`.
 *
 * La fuente misma es un barrel: su dueño canónico es
 * `@claude-code-how-works/config/gitFilesystem` — `agent/git/` sólo
 * reexporta para que el código de este paquete pueda importar el subpath
 * local sin acoplarse al paquete hermano en cada call-site.
 *
 * `@thyrox/config` ya es dependencia declarada de este paquete y ya trae
 * `gitFilesystem.ts` con el porte completo (resolución de `.git`, lectura de
 * HEAD/refs, caché de rama/remoto, detección de shallow clone/worktree —
 * 18 símbolos). Resuelve por el catch-all `"./*.js": "./*.ts"` de
 * `config/package.json`, verificado en vivo:
 * `bun -e "import('@thyrox/config/gitFilesystem.js')"` desde dentro de este
 * paquete.
 */
export * from '@thyrox/config/gitFilesystem.js'

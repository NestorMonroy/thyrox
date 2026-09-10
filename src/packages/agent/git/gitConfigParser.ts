/**
 * Porte COMPLETO de `ccnmt: packages/agent/git/gitConfigParser.ts`.
 *
 * La fuente misma es un barrel: su dueño canónico es
 * `@claude-code-how-works/config/git/gitConfigParser` — `agent/git/` sólo
 * reexporta para que el código de este paquete pueda importar el subpath
 * local sin acoplarse al paquete hermano en cada call-site.
 *
 * `@thyrox/config` ya es dependencia declarada de este paquete y ya trae
 * `git/gitConfigParser.ts` con el porte completo
 * (`parseGitConfigValue`/`parseConfigString`) — resuelve por el catch-all
 * `"./*.js": "./*.ts"` de `config/package.json`, verificado en vivo:
 * `bun -e "import('@thyrox/config/git/gitConfigParser.js')"` desde dentro de
 * este paquete.
 */
export * from '@thyrox/config/git/gitConfigParser.js'

Corriges el defecto H-THYROX-262 del build JavaScript de los paquetes @thyrox. El
`Item:` de abajo nombra los archivos que te pertenecen; no toques ningún otro. Edita con
`sed`, `gawk` o `bash bin/replace_literal`.

Lo medido (banco `.claude/workbench/pool-worktree-build-20260929T105549/`):
- `bin/typescript-build-javascript` corre `Bun.build` 1.3.11 con `splitting`,
  `packages: 'external'`, `target: 'bun'`.
- `src/packages/agent/agentHostBindings.ts` carga módulos con `require('./…')` perezoso,
  y Bun envuelve esos módulos y sus dependencias en `__esm(() => { … })`.
- Un shim de paquete como `src/packages/agent/SessionMemory/sessionMemoryUtils.ts` hace
  `export * from '@thyrox/memory/sessionMemoryUtils'` más una lista explícita
  `export { … } from '…'` de los nombres de VALOR, generada por
  `src/verify/expandStarShims.ts`. En el chunk emitido el `export *` queda DENTRO del
  `__esm`, y el chunk no parsea: `SyntaxError: Unexpected keyword 'export'`. Cae
  `@thyrox/agent` y, por él, `@thyrox/cli`, `@thyrox/permission` y `@thyrox/provider`.
- Repro mínimo en el banco, `repro-export-star.sh`: con `export * from 'ext'` falla; con
  `export type * from 'ext'` (borrado al compilar) el chunk carga y los valores siguen
  llegando por la lista explícita.
- Hay 30 shims: `git grep -lE "^export \* from '@thyrox/" -- 'src/packages/**/*.ts' ':!**/__tests__/**'`.

Lo que haces:
1. En cada uno de los 30 shims, `export * from '<spec>'` pasa a `export type * from '<spec>'`.
   La lista explícita de valores se conserva tal cual.
2. `src/verify/expandStarShims.ts` reconoce el shim en su forma nueva: su expresión `STAR`
   acepta `export type * from '@thyrox/…'`, y la lista de valores se sigue generando
   resolviendo ese especificador. Actualiza su docstring: el `*` que se conserva es de
   tipos, y por qué (el `export *` de valores dentro de `__esm` no parsea). Sin historial
   en comentarios: la intención, no la fecha.
3. En `tests/verify/expandStarShims.test.ts`, un caso que falla hoy y pasa después: un shim
   `export type * from '@thyrox/…'` se reconoce y su `--check` pasa con la lista correcta,
   y otro que prueba que la reescritura emite la forma `export type *`.

Comprueba antes de terminar: `bun test tests/verify/expandStarShims.test.ts` y
`bash <banco>/verify.sh` (el banco es el directorio de esta plantilla). No commitees.

# Pool de un ítem — shims `export type *` para que el build JS parsee

Trabajas en un worktree de thyrox. Identificadores, nombres de archivo, funciones, firmas y
variables en inglés; comentarios en español técnico, sin coloquialismos (clean-code). No toques
`_references/`, `agent-results/`, `.claude/` ni `.env.example`. **No toques
`src/agents/`, `src/packages/tools/` ni `src/packages/daemon/`**: otro pool trabaja ahí.
Operaciones de archivo por Bash (`sed`, `gawk`, `bin/replace_literal`); para una herramienta de
`src/` usa su envoltorio de `bin/`. Las pruebas TypeScript con `bun test`.

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma (el pool lo rehúsa y el ítem no se integra).
- **Nada en segundo plano y nunca termines el turno para esperar algo**: si cierras el turno,
  el ítem termina. Todo en primer plano, acotado con `timeout`.
- TDD: la prueba primero, en rojo; luego el cambio. Todo arreglo trae su **control de
  anulación**: retira la causa, comprueba que caen exactamente las aserciones que dependen de
  ella, restáurala y vuelve a verde. Informa las dos salidas.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

Tu ítem es el que dice `Item:` al final. Haz SÓLO ese.

## Item `type-star-shims` (TASK-THYROX-0559, H-THYROX-262)

El build JS (`bash bin/typescript-build-javascript <paquete>...`, sobre `Bun.build`) deja un
chunk `__esm` de `agent` que no parsea: los shims de paquete `export * from '@thyrox/…'`
reexportan en tiempo de ejecución módulos cuyos nombres sólo son tipos. Hay ~30 shims así,
repartidos en `agent`, `app-host`, `cli`, `command-runtime`, `repl` y `storage` (localízalos
con `git grep -lE "^export \* from '@thyrox/" -- 'src/packages/**/*.ts'`, excluyendo
`__tests__`).

- Los shims que reexportan sólo TIPOS pasan a `export type * from '@thyrox/…'`. Uno que
  reexporta también VALORES sigue siendo `export *` (o lleva sus nombres de valor explícitos,
  como ya hace `src/verify/expandStarShims.ts`): decide por shim midiendo qué exporta el
  destino, no por su nombre. Declara en el informe cuántos shims pasaron a cada forma.
- `src/verify/expandStarShims.ts` reconoce la forma `export type * from` (no la expande: no
  hay valores que declarar) y su prueba `tests/verify/expandStarShims.test.ts` lo cubre.
- Verificación: `bash bin/typescript-build-javascript agent cli permission provider` sale 0, y
  un `bun -e` importa cada uno desde su `dist` sin error de parseo. Reproduce primero el fallo
  (el rojo) y cítalo en el informe.
- `tsc` del paquete tocado no puede ganar errores: compara el conteo antes y después con el
  comando que el paquete ya use (`bun x tsc -p <paquete>/tsconfig.json --noEmit` o el que
  encuentres declarado).

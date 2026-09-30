Corriges el build JavaScript de los paquetes @thyrox para los addons nativos `.node`.
El `Item:` de abajo nombra los archivos que te pertenecen; no toques ningún otro. Edita
con `sed`, `gawk` o `bash bin/replace_literal`.

Lo medido (banco `.claude/workbench/pool-worktree-build-20260929T105549/`):
- `src/typescript/buildJavascript.ts` (`buildPackage`) corre `Bun.build` con `splitting`,
  `packages: 'external'`, `target: 'bun'`, `root` = el `rootDir` del paquete.
- `@thyrox/transparent-napi` no construye: `Could not resolve:
  "../native/build/Release/transparent.node"`. Su `src/index.ts` hace
  `require('../native/build/Release/transparent.node')` como candidato opcional (compilado
  local) junto a `require('../vendor/x64-linux/transparent.node')`; el primero no existe
  mientras nadie compile el addon, y el empaquetador rehúsa resolverlo.
- Los otros seis `*-napi` sí construyen, pero el empaquetador COPIA sus `.node` a `dist/`
  (13 MB en ripgrep-napi): cada build duplica binarios que ya viven en `vendor/`.
- Medido con `bun build … --external '*.node'`: construye, y el `.js` conserva
  `require("../vendor/…/x.node")` y `require("../native/…")` tal cual. Los ocho `*-napi`
  declaran `rootDir: "src"` en `tsconfig.build.json`, así que `dist/` queda a la misma
  profundidad que `src/` y la ruta relativa resuelve igual desde los dos.

Lo que haces:
1. `buildPackage` pasa `external: ['*.node']` a `Bun.build`, con su razón en el docstring
   del módulo junto a las otras opciones (qué pasaba sin ella; por qué la ruta relativa
   sigue resolviendo: `dist/` y `src/` a la misma profundidad). Sin historial ni fechas.
2. En `tests/typescript/buildJavascript.test.ts`, un caso que falla hoy y pasa después: un
   paquete sintético con `rootDir: "src"` cuyo fuente hace `require('../vendor/x.node')`
   de un archivo que existe y `require('../native/y.node')` de uno que no: construye, el
   `.js` emitido conserva los dos `require` relativos y `dist/` no contiene ningún `.node`.

Comprueba antes de terminar: `bun test tests/typescript/buildJavascript.test.ts` y
`bash <banco>/verify.sh` (el banco es el directorio de esta plantilla). No commitees.

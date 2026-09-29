Corriges el defecto H-THYROX-263 del build JavaScript de los paquetes @thyrox, como una
REGLA del build, no como un caso especial de un archivo. El `Item:` de abajo nombra los
archivos que te pertenecen; no toques ningún otro (ni los módulos de `src/packages`, ni
los shims `export *`, que son otro cambio). Edita con `sed`, `gawk` o
`bash bin/replace_literal`.

La regla:

    si un módulo compilado resuelve un recurso relativo a sí mismo
    (import.meta.url, import.meta.dir, __dirname)
    → ese recurso forma parte del artefacto runtime
    → el build debe emitirlo junto al .js, o declarar que no lo hace y por qué

Lo medido (banco `.claude/workbench/pool-worktree-build-20260929T105549/` y
`shim-export-type-star-20260929T105924/diagnose-podman.sh`):
- `src/typescript/buildJavascript.ts` emite con `Bun.build` un `.js` por fuente a
  `dist/`, con `root` = el `rootDir` del paquete (`projectShape`), así que `dist/x.js`
  queda en la misma posición relativa que su fuente bajo `rootDir`.
- Construido, `@thyrox/agent` muere al cargar: `src/packages/agent/models.ts:118-120`
  hace `readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'models.jsonl'))`, y
  desde `dist/models.js` esa ruta es `dist/models.jsonl`, que el build no emite (ENOENT).
- Mismo patrón en 31 `src/packages/tools/src/definitions/<nombre>.ts`, que leen
  `<nombre>.prompt.md` de su directorio (lectura perezosa, en el getter `prompt`).
- Las referencias relativas al módulo que hay en `src/packages` (43 líneas en 41
  archivos, fuera de pruebas y `bin/`) son de CUATRO clases, y sólo la primera es este
  arreglo:
  1. datos junto al módulo (los dos casos de arriba): el build los EMITE;
  2. otro módulo de código (`mitm/src/manager.ts:66`, `new URL('./server/main.ts',
     import.meta.url)`): NO se copia un `.ts`; se DECLARA en el informe del build;
  3. subir a la raíz del repositorio (`config/gpuAdmission.ts:38`, `paths/reach.ts`,
     `paths/docs.ts`): no es un recurso; se DECLARA;
  4. sólo en modo empaquetado o en otro sistema (`agent/claudeInChromeSetup.ts`,
     `computer-use-mcp` `cli.js`/`bridge.py`, `shell/.../sandboxRipgrepResolver.ts`): se
     DECLARA.
  No copies los 41 archivos indiscriminadamente: emite sólo lo que resuelve a un
  archivo de datos existente (no `.ts`/`.tsx`/`.js`) dentro del `rootDir` del paquete.

Lo que haces:
1. En `buildJavascript.ts`, tras `Bun.build`, un paso que por cada fuente de entrada del
   paquete encuentra las referencias relativas al módulo con un argumento LITERAL
   (`join(<dir del módulo>, '<literal>'…)`, `new URL('<literal>', import.meta.url)`,
   incluido el alias de una constante como `HERE`), las resuelve contra el directorio del
   fuente y, si el destino es un archivo de datos existente bajo `rootDir`, lo copia a la
   misma posición relativa bajo `dist/`. Las que no emite (código, fuera de `rootDir`, no
   literales, inexistentes) salen en una lista declarada con su motivo, que `main`
   imprime por paquete. Una referencia literal a un archivo de datos que NO existe es un
   fallo del build del paquete, no un aviso.
2. El docstring del módulo enuncia la regla y por qué (el `.js` emitido resuelve sus
   datos relativos a `dist/`). Sin historial ni fechas en comentarios.
3. En `tests/typescript/buildJavascript.test.ts`, pruebas que EJECUTAN el código desde
   `dist/`, no desde `src/`: un paquete sintético (rootDir `src`) cuyo módulo lee
   `join(HERE, 'data.json')` al cargar; se construye y se importa `dist/<modulo>.js`, que
   devuelve el contenido. Control de anulación: con la emisión desactivada (una opción
   del paso, sólo para la prueba) el mismo import cae con ENOENT, y ninguna otra
   aserción cambia. Otro caso: una referencia a otro `.ts` y una que sube fuera de
   `rootDir` quedan declaradas y no se copian.

Comprueba antes de terminar: `bun test tests/typescript/buildJavascript.test.ts` y
`bash <banco>/verify.sh` (el banco es el directorio de esta plantilla). No commitees.

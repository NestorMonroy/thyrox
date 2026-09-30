Haces que el código ejecutado desde `dist/` encuentre sus recursos runtime por sí
solo, sin depender del árbol fuente. El `Item:` de abajo nombra los archivos que te
pertenecen; no toques ningún otro. En particular NO toques nada bajo `.claude/`: el
verify vive fuera de tu worktree y un parche que toque el banco se rechaza.
Edita con `sed`, `gawk` o `bash bin/replace_literal`.

Contexto medido (léelo antes de empezar):
- Hallazgos H-THYROX-263..266: `bash bin/agent_store buscar-hallazgos H-THYROX-26`.
- Un intento anterior, RECHAZADO, está en `.claude/workbench/build-runtime-assets-20260929T111144/outputs/1.patch`. Su enfoque para 263 y
  264 es correcto y puedes partir de él: leer el `.js` emitido (con los comentarios
  `// <ruta fuente>` de Bun) y copiar cada recurso JUNTO al `.js` que lo lee, no en la
  posición espejo del fuente (un módulo con dos entradas acaba en un chunk en la raíz de
  `dist/`). Medido con close-check sobre ese parche: criterios 1, 2a y 2b pasan; 5, 3 y
  3b fallan. Te falta 265 y 266.
- H-THYROX-265: Bun hornea `__dirname` como ruta ABSOLUTA del directorio fuente
  (`var __dirname = "/w/src/packages/computer-use-mcp/src/legacy/win32"`); sólo
  `bridgeClient.ts` lo usa (`path.join(__dirname, 'bridge.py')`, dos sitios). Cámbialo
  a `import.meta.url`/`import.meta.dir` para que el artefacto no dependa de la ruta del
  árbol, y que `bridge.py` se emita junto a su lector como los demás recursos. No
  inventes una prueba de Windows en tiempo de ejecución.
- H-THYROX-266: el builder no limpia `dist/`; los chunks con hash de un build anterior
  sobreviven. El build tiene que dejar en `dist/` sólo lo que ese build emitió.

El contrato (lo mide el verify, `.claude/workbench/build-runtime-assets-20260929T111144/close-check.sh`, en Podman sobre una capa
superpuesta; léelo):
1. 31 de 31 prompts de tools se leen desde `dist` con `src` oculto, por sus getters
   reales, y el conjunto coincide con el de `src` por nombre.
2. `models.jsonl` junto a su lector, y `agent/dist/models.js` carga con `src` oculto.
3. Ningún `.js` emitido lleva `__dirname`/`__filename` absoluto; `bridge.py` está
   donde lo resuelve su lector.
3b. 0 diferencias en `dist` entre dos builds equivalentes en `/w` y en `/v` (no fijes
   el total de archivos: puede cambiar legítimamente).
5. Un chunk centinela plantado en `dist/` desaparece con el segundo build.

Pruebas nuevas en `tests/typescript/buildJavascript.test.ts` (TDD, rojo primero):
- 265: un paquete sintético que lee un recurso relativo a sí mismo se construye en dos
  rutas distintas y su `dist` sale byte a byte igual; control de anulación: con la
  referencia a `__dirname` sin transformar, la prueba cae.
- 266: DOS pruebas. Una sobre el builder real (`buildPackage`) con un chunk centinela
  en `dist/` que tiene que desaparecer; otra localizada sobre la función que limpia.
- Conserva la prueba sintética del intento anterior (ON carga, OFF da ENOENT).

Cierre del ítem (obligatorio):
- Todo en primer plano; sin trabajos en segundo plano ni `git stash`.
- NO ejecutes `bash bin/typescript-build-javascript` en tu worktree: reapunta 51
  `package.json` y ese cambio entra en tu parche. Para medir, usa
  `bash .claude/workbench/build-runtime-assets-20260929T111144/close-check.sh`, que construye dentro de Podman sin tocar tu árbol.
- Tu mensaje final incluye: el rojo inicial de cada prueba nueva, el verde final de
  `bun test tests/typescript/buildJavascript.test.ts`, la salida completa de
  `close-check.sh` y los controles de anulación con sus conteos.

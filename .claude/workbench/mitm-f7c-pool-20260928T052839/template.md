Portas a thyrox (Bun, TypeScript) una pieza del MITM de OmniRoute, en TDD, dentro de
`src/packages/mitm/`. El `Item:` de abajo nombra la pieza y su referencia.

Reglas del árbol (léelas en `.claude/rules/` y `.claude/CLAUDE.md`, que cargan solas):
- Primero la prueba en `src/packages/mitm/__tests__/` (nombre camelCase, `bun:test`), en rojo;
  después la implementación. Porta también las pruebas de referencia que el Item nombre.
- Identificadores en inglés; comentarios en español, de intención, sin historial.
- Cabecera de cada archivo nuevo: `Porte de \`omniroute: <ruta>\` (MIT).` y sus divergencias.
- Reutiliza lo ya portado antes de escribir nada: `src/server/*` (mitmServer, serverConfig,
  bypass, forwardTarget, ingest), `src/cert/*`, `src/dns/*`, `src/sudoGate.ts`,
  `src/privilegedMitmStep.ts`, `src/stopDnsTeardown.ts`, `src/repair.ts`, `src/state/*`,
  `src/targets/*`, `src/systemCommands.ts`, `@thyrox/provider/proxy/proxyEndpoint`.
- Variables de entorno propias con prefijo `THYROX_MITM_`, cada una con su caso de prueba.
- Sin imports dinámicos. La palabra «Claude» con mayúscula no va en src; usa `PRODUCT_NAME`.
- Nada de `/tmp` fijo: usa `os.tmpdir()` + `mkdtemp` en pruebas.
- No commitees: deja los archivos en tu worktree.

Al terminar, `bun test` del paquete y `bunx tsc -p tsconfig.build.json --noEmit` deben
quedar en verde (0 errores). Responde con la lista de archivos creados y un resumen de dos líneas.

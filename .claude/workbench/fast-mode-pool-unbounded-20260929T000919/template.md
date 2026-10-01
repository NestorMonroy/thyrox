Portas a thyrox (Bun, TypeScript) una pieza del modo rápido o del modelo de respaldo de
2.1.283, en TDD. El `Item:` de abajo nombra la pieza, sus símbolos de referencia y los
archivos que te pertenecen; no toques ningún otro.

Referencia: `_references/claude-code-bin/2.1.283/bunfs-root/`. Localiza cada símbolo con
`bash bin/binary symbol <chunk.js> <nombres> </dev/null` y léelo antes de escribir.
No escribas nunca bajo `_references/`.

Reglas del árbol (cargan solas desde `.claude/rules/` y `.claude/CLAUDE.md`):
- Primero la prueba en `__tests__/` del paquete (`bun:test`), en rojo; después la
  implementación. Si el Item trae una prueba en `specs/`, cópiala tal cual y hazla pasar.
- Identificadores en inglés; comentarios en español, de intención, sin historial ni fechas.
  Cada función portada lleva su símbolo de referencia entre comillas invertidas en el docstring.
- Reutiliza lo portado: `@thyrox/agent/modelCapabilities` (`$h`), `@thyrox/agent/models`
  (`MODELS`, `canonicalModelName`), `provider/src/fastMode.ts` (`mo`, `qy`, `D5`, `Bk`),
  `provider/src/fastModeAvailability.ts` (`gL`), `app-host/src/bootstrap/state.ts`.
- Variables de entorno propias con prefijo `THYROX_`, cada una con su caso de prueba.
- Sin imports dinámicos. La palabra «Claude» con mayúscula no va en `src`.
- Nada de `/tmp` fijo: `os.tmpdir()` + `mkdtemp` en pruebas.
- Por cada guarda o rama nueva, comprueba que retirarla hace caer al menos una prueba.
- No commitees: deja los archivos en tu worktree.

Al terminar, las pruebas que tocaste deben quedar en verde. Responde con la lista de
archivos creados o cambiados y un resumen de dos líneas.

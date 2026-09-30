Trabajas en `@thyrox/binary` (Bun, TypeScript), la herramienta que lee el ejecutable de
referencia y su corpus versionado en `_references/claude-code-bin/<versión>/`
(`MANIFEST.tsv`, `README.md`, `claude_strings.txt`, `bunfs-root/`). El `Item:` de abajo
nombra los archivos que te pertenecen; no toques ningún otro.

Contexto medido (no lo vuelvas a descubrir):
- La versión canónica de la referencia es 2.1.283 y está declarada en
  `src/packages/binary/src/canonical.ts` (`CANONICAL_REFERENCE_VERSION`, `canonicalRoot`).
  La paridad del daemon se mide contra ella y NO debe moverse porque el ejecutable vivo
  cambie.
- El ejecutable vivo (`/opt/claude-code/bin/claude`) es hoy 2.1.284 y no tiene corpus ni
  fila en `MEASURED` (`__tests__/bunfs.test.ts`). 2.1.283: 2371 entradas, 45 403 377 B,
  que coinciden con la suma de su `MANIFEST.tsv`.
- `writeCorpus` (`src/corpus.ts`) ya rehúsa escribir una versión que tenga `MANIFEST.tsv`.

Reglas:
- NUNCA escribes bajo `_references/`: ni en pruebas ni al ejecutar nada. Las pruebas que
  escriben un corpus usan `mkdtemp` bajo `os.tmpdir()`.
- Primero la prueba, en rojo; después la implementación. Por cada guarda o rama nueva,
  comprueba que retirarla hace caer al menos una prueba, y dilo en tu respuesta.
- Un estado sin medir nunca se presenta como verde silencioso: se nombra.
- Identificadores, nombres de archivo y firmas en inglés; comentarios en español técnico,
  sin coloquialismos, con los términos técnicos en inglés. La palabra «Claude» con
  mayúscula no va en `src`. Sin imports dinámicos ni `require` dentro de funciones.
- Toda variable `THYROX_*` nueva lleva prueba y una línea comentada en `.env.example`
  (sólo si tu `Item:` lo autoriza).
- No añadas dependencias; no toques `bun.lock`. No leas stdin. No lances trabajos en
  segundo plano ni corras `tests/run.sh`: sólo `bun test` en `src/packages/binary`.
- No commitees: deja los archivos en tu worktree. No termines esperando una notificación.

Al terminar, `bun test` en `src/packages/binary` queda en verde salvo, a lo sumo, el caso
de la build viva si tu `Item:` no es el que lo cambia. Responde con los archivos cambiados,
los controles de anulación y un resumen de dos líneas.

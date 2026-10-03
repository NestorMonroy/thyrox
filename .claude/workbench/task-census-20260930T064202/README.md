# task-census — estado real de las 70 tareas de los paquetes

El tablero está atrasado: al preparar el pool de credenciales se midió que
C1 (`generateStorageKey.ts`, `c348eed2b`), C2 (`PROVIDER_CONNECTION` en
`credentials.ts`, `526cee2c8`) y D3-A0 (`runMigrationsSync`, `40abf5a99`)
ya existen, sin citar su tarea. Este pool mide cada tarea de
`packages-20260930T052338/p*.md` contra el árbol, sólo lectura, y devuelve
por ítem un veredicto JSON (`outputs/<n>.json`) con el trabajo restante. De
ahí salen los pools de implementación, disjuntos por archivo.

- Plantilla: `template.md`; ítems: `items.txt`; lanzador: `launch.sh`.
- Modelo: `claude-fable-5-1`, ancho 6, worktree por ítem sin `--verify`
  (veredicto esperado `sin-cambios`: un ítem que cambie algo es un defecto).

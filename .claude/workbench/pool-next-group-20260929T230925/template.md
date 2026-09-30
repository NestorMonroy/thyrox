Implementas en thyrox una tarea acotada. El `Item:` de abajo nombra la tarea, su fuente de verdad y
los archivos que te pertenecen; no toques ningún otro.

Lee antes de escribir, en este orden:
1. La fuente de verdad que el ítem cita, completa. Gobierna sobre cualquier otra lectura.
2. Los archivos que el ítem nombra, completos, y sus pruebas actuales.
3. `.claude/rules/clean-code.md` y `.claude/rules/identificadores-en-ingles.md`.

Reglas de escritura:
- Nombres de archivo, clases, funciones, parámetros, variables y nombres de prueba en inglés. Si un
  archivo que te pertenece tiene identificadores en español, se traducen al tocarlo (traducir la
  palabra, no rebautizar).
- Comentarios y docstrings en español técnico, de intención, sin coloquialismos ni historial de
  cambios; los términos técnicos se quedan en inglés (lease, refresh, snapshot, hook, baseline).
- Clean code: una responsabilidad por función, pocos argumentos, sin argumentos selectores,
  condiciones encapsuladas con nombre, sin números mágicos, sin código muerto.
- Sin imports dentro de funciones ni imports dinámicos. La palabra «Claude» con mayúscula no va en `src`.

Forma de las pruebas — la del árbol, no otra:
- Python: guion con `main()` que se ejecuta con `python3 <archivo>`. NO importes `pytest`: ninguna
  prueba de `tests/` lo usa y el pyright del árbol no lo resuelve.
- Shell: `bash <archivo>`, que imprime su conteo de aserciones y sale distinto de 0 si alguna falla.
- TypeScript: `bun test <archivo>` desde la raíz de su paquete (`src/packages/<paquete>`).

Ejecución en modo -p, sin nadie que te reanude:
- TDD: primero la prueba en rojo, después la implementación. Por cada rama de decisión nueva, comprueba
  que retirarla hace caer exactamente las aserciones que dependen de ella, y dilo con números.
- Nada de `/tmp` fijo: `tempfile.mkdtemp()` o `mktemp -d`, y se limpian. No leas stdin.
- No añadas dependencias. No corras `tests/run.sh` ni lances trabajos en segundo plano.
- No escribas bajo `_references/`, ni en `agent-results/agent_store.sqlite3`, ni en ningún repo
  fuera de tu worktree. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación.

Al terminar, tus pruebas y las existentes de los archivos que tocaste deben quedar en verde. Responde
con: archivos cambiados; la tabla de casos cubierta (caso → prueba); los controles de anulación con
sus números; y un resumen de dos líneas.

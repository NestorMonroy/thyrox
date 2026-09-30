Implementas en thyrox un PAQUETE de tareas. El `Item:` de abajo nombra el paquete, su fuente de
verdad (un archivo con cada tarea: su tarjeta, su cita TASK-THYROX-NNNN y su descripción), el orden
y los archivos que te pertenecen; no toques ningún otro. Otros ítems trabajan a la vez en otros
worktrees sobre otros archivos.

Trabaja las tareas en el orden que el ítem fija. Las tareas son grandes: avanza de verdad y
verificado, tarea por tarea. Una tarea a medias se entrega a medias, dicho con claridad: nunca la
declares terminada sin sus pruebas en verde. Si una tarea está bloqueada por algo que no está en tu
mano, dilo con la causa medida y pasa a la siguiente.

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
- Nunca uses `git stash`: el pool marca el ítem `con-stash` y lo rechaza (grupo 4, sus 2 ítems). Para el control de anulación copia el archivo con `mktemp`, revierte, mide y restáuralo desde la copia.
- No añadas dependencias. No corras `tests/run.sh` entero ni lances trabajos en segundo plano: corre las pruebas de lo que tocas.
- No ejecutes `bin/binary extract`: escribe un corpus nuevo en `_references/` del árbol principal. El
  corpus de 2.1.283 ya está extraído en `/home/user/thyrox/_references/claude-code-bin/2.1.283/`: léelo
  con `rg`/`sed -n`, o con `bin/binary symbol|literal|declarations`.
- No escribas bajo `_references/`, ni en `agent-results/agent_store.sqlite3`, ni en ningún repo
  fuera de tu worktree. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación.

Antes de terminar, corre sobre los archivos que tocaste los mismos linters que el pre-commit: `bash bin/check_lint_zero <archivos .py y .sh>` y, si tocaste un paquete TS, `bash bin/check_package_typecheck --strict <paquete>`. Deben dar cero hallazgos propios.

Al terminar, tus pruebas y las existentes de los archivos que tocaste deben quedar en verde. Responde
con, POR TAREA (tarjeta y cita): estado (hecha, a medias, bloqueada y por qué); archivos cambiados; la tabla de casos cubierta (caso → prueba); los controles de anulación con
sus números; y un resumen de dos líneas.

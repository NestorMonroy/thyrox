Implementas en thyrox UNA tarea. El `Item:` de abajo trae su cita TASK-THYROX-NNNN y la ruta ABSOLUTA de
su `prompt.md`: léelo entero antes de nada; gobierna sobre cualquier otra lectura. Ese archivo vive en
el árbol principal y tu worktree no lo trae: léelo por esa ruta. El prompt nombra los archivos que te
pertenecen; no toques ningún otro. Otros ítems trabajan a la vez en otros worktrees sobre otros archivos.

Lee antes de escribir, en este orden:
1. El `prompt.md` del ítem, completo, y la fuente que cita.
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

Si la tarea resulta mayor de lo que cabe en tu plazo, entrega una fase completa y verificada, y di
qué fase sigue. Nunca la declares hecha sin sus pruebas en verde. Si está bloqueada por algo que no
está en tu mano, dilo con la causa medida.

Cómo lo hace la referencia: antes de diseñar, mide cómo resuelve lo mismo el ejecutable en
`/home/user/thyrox/_references/claude-code-bin/2.1.283/` (sólo lectura: `rg`, `sed -n`, o
`bash bin/binary symbol|literal|declarations`; nunca `bin/binary extract`). Tu worktree no incluye
`.claude/workbench/`, así que el análisis NO se escribe en archivos: va en tu respuesta final, en una
sección «Análisis del binario» con cada símbolo o literal consultado, su chunk y línea, qué hace y
qué decidiste portar o declarar como divergencia. Esa respuesta queda registrada en la salida del
pool, dentro del banco del workbench.

Al terminar, tus pruebas y las existentes de los archivos que tocaste deben quedar en verde. Responde
con: estado (hecha, fase entregada y cuál sigue, o bloqueada y por qué); archivos cambiados; la tabla
de casos cubierta (caso → prueba); los controles de anulación con sus números; y un resumen de dos
líneas.

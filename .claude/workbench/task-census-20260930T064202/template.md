Mides el estado REAL de una tarea de thyrox contra el árbol, sin cambiar nada. El tablero está atrasado: varias tareas marcadas «pending» ya están hechas en el código, sin citar su id en el commit. Tu veredicto decide qué se implementa después, así que cada afirmación sale de un comando que ejecutaste, nunca de la descripción de la tarea.

El `Item:` de abajo trae el id de la tarea y la ruta ABSOLUTA del archivo que la describe (sección `## [N] <id>`). Ese archivo vive en el árbol principal y tu worktree no lo trae: léelo por esa ruta. Tu directorio de trabajo es un worktree del mismo commit que el árbol principal; mide sobre él.

Procedimiento:
1. Lee la sección de la tarea completa. Extrae cada pieza que nombra: archivos, símbolos, subcomandos, casos de prueba, decisiones, dependencias («Depende de …»).
2. Por cada pieza, búscala en el árbol: `git grep -n`, `rg`, `ls`, `sed -n`. Un símbolo portado puede llevar otro nombre: si el literal no aparece, busca por el mecanismo (qué hace) antes de concluir que falta.
3. `git log --oneline -S'<símbolo>'` acotado al archivo (nunca `--all`) o `git log --oneline -- <archivo>` para saber qué commit lo trajo.
4. Si la tarea pide pruebas, localiza la suite y córrela UNA vez (`bun test <archivo>` desde `src/packages/<paquete>`, `python3 <archivo>`, `bash <archivo>`); anota el conteo.
5. Si la tarea porta algo del ejecutable 2.1.283, el corpus está en `/home/user/thyrox/_references/claude-code-bin/2.1.283/` (sólo lectura; léelo con `rg`/`sed -n`, o con `bash bin/binary symbol|literal|declarations`). Nunca ejecutes `bin/binary extract`.

Reglas:
- No edites ni crees archivos, no commitees, no lances trabajos en segundo plano, no escribas en `/tmp` ni fuera de tu worktree.
- Una cifra va con el comando que la produjo.
- «hecha» exige que TODAS las piezas estén y su prueba pase. Si falta una sola, es «parcial».

Tu respuesta final es SÓLO un bloque JSON (sin texto antes ni después), con esta forma:
{"task": "<id>", "status": "hecha|parcial|pendiente|obsoleta|bloqueada",
 "evidence": ["<pieza>: <archivo:línea o commit> — <comando>"],
 "remaining": ["<pieza que falta, concreta y verificable>"],
 "files": ["<archivos que tocaría el trabajo restante>"],
 "tests": ["<suite y conteo medido, o la suite que habría que escribir>"],
 "depends_on": ["<id de tarea que debe ir antes, o condición>"],
 "blocked_by": "<decisión, hardware o credencial que falta; vacío si nada>",
 "size": "S|M|L"}

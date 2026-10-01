# Dos defectos de la validación de TASK-THYROX-0608 — un ítem de dos

Trabajas en un worktree de thyrox. Identificadores, nombres de archivo y firmas en inglés;
comentarios en español técnico, sin coloquialismos, con los términos técnicos en inglés. No
toques `_references/`, `agent-results/` ni `.claude/`. Operaciones de archivo por Bash (`sed`,
`gawk`, `bin/replace_literal`); para una herramienta de `src/` usa su envoltorio de `bin/`,
nunca `python3 src/...` por su ruta. Las pruebas de `tests/` se corren con `uv run python`.

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma.
- **Nada en segundo plano y nunca termines el turno para esperar algo**: si cierras el turno,
  el ítem termina. Corre las pruebas en primer plano, acotadas con `timeout`.
- TDD: la prueba primero, en rojo; luego el cambio. Todo arreglo trae su **control de
  anulación**: retira la causa y comprueba que caen exactamente las aserciones que dependen de
  ella; restáurala y vuelve a verde. Informa las dos salidas.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

Tu ítem es el que dice `Item:` al final. Haz SÓLO ese.

## Item `quoted-text-detector` (TASK-THYROX-0609, H-THYROX-277)

`src/hooks/detect_library_path_invocation.py` avisa cuando un comando invoca `python3
src/…py` teniendo envoltorio en `bin/`. Descarta el cuerpo de un heredoc
(`src/hooks/shell_text.py::strip_heredoc_bodies`) pero no un **argumento entrecomillado que es
dato**, y ahí da falsos positivos medidos:

- `printf '%s' 'python3 src/verify/check_rst_sintaxis.py' > nota.txt`
- `bash bin/agent_store agregar-hallazgo --content "... python3 src/verify/check_rst_sintaxis.py ..."`
- `printf '%s' '{"command":"python3 src/verify/check_rst_sintaxis.py"}' | bash bin/tool_use_preflight`

Arreglo: el texto entre comillas no cuenta, **salvo** cuando es código que una shell va a
ejecutar: el argumento de `bash -c`, `sh -c`, `zsh -c`, `eval`, o el comando que sigue a
`timeout N`, `env`, `nohup`, `xargs`. Esos casos DEBEN seguir avisando
(`bash -c 'python3 src/verify/check_rst_sintaxis.py'`). Pon la lógica en
`src/hooks/shell_text.py` como función reutilizable (los detectores hermanos tienen el mismo
recorte), con su prueba en `tests/hooks/test_shell_text.py` si existe, o créala. Añade a
`tests/hooks/test_detect_library_path_invocation.py` los tres falsos positivos (deben callar) y
los casos `-c`/`eval` (deben avisar); no rompas los 9 existentes. Dos controles de anulación:
sin descartar las comillas caen los tres falsos positivos; sin la excepción de `-c`/`eval`
caen esos casos.

## Item `rst-sintaxis-flags` (TASK-THYROX-0610, H-THYROX-278)

`src/verify/check_rst_sintaxis.py`, `main()` (hacia la línea 311): sólo reconoce `--quiet`,
`--strict` y `--nuevos`; toda otra bandera se descarta en silencio y, sin rutas, audita todo
`source/` (5852 `.rst` medidos): `bin/check_rst_sintaxis --help` no termina en un turno.

Arreglo, **antes** de cualquier recorrido y antes de `_reexec_en_venv()` si es posible:

- `--help` / `-h`: imprime el uso (las banderas reconocidas, que las rutas sueltas acotan el
  alcance, y la primera línea del docstring del módulo) y sale 0 sin auditar;
- cualquier otra bandera que empiece por `-` y no esté reconocida: sale 2 nombrándola en
  stderr, sin auditar y **sin emitir conteo** (un 0 ahí sería un verde falso).

Prueba nueva en `tests/verify/test_check_rst_sintaxis_args.py`, que invoca
`bin/check_rst_sintaxis` como subproceso con `timeout` corto (si audita, la prueba debe fallar
por tiempo, no colgarse): `--help` y `-h` salen 0 y listan `--quiet`, `--strict`, `--nuevos`;
`--desconocida` sale 2 y la nombra; ninguno de los tres imprime `alcance medido`. Control de
anulación: retirado el rechazo de banderas desconocidas, cae su caso (por tiempo o por código).

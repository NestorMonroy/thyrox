Corriges en TDD un guion Python de thyrox. El `Item:` de abajo nombra el cambio y los
archivos que te pertenecen; no toques ningún otro.

Reglas del árbol (cargan solas desde `.claude/rules/` y `.claude/CLAUDE.md`):
- Primero la prueba, en rojo, en el archivo de pruebas que nombra el Item; después la
  implementación. Conserva las pruebas existentes: sólo cambian las que el Item corrige.
- Identificadores en inglés; comentarios y docstrings en español, de intención, sin
  historial ni fechas. Cada docstring declara qué mide y a qué es ciego cuando concluye
  algo a partir de una medida.
- Reutiliza lo que ya existe (`session.user_wiring`: `live_settings`, `declared_wiring`,
  `wiring_drift`; `session.transcripts`); no dupliques su lógica.
- Sin `/tmp` fijo: `tmp_path` o `tempfile.mkdtemp` en pruebas. Las pruebas crean sus
  propios repos git temporales; no dependen de los clones de la máquina.
- Nunca leas ni imprimas el contenido de `.env` ni de ningún archivo de credenciales:
  sólo su existencia.
- Por cada guarda o rama nueva, comprueba que retirarla hace caer al menos una prueba.
- No commitees: deja los archivos en tu worktree.

Al terminar, `python3 -m pytest -q tests/session/test_session_restart.py` debe quedar en
verde. Responde con la lista de archivos cambiados y un resumen de dos líneas.

Ejecución en modo -p, sin nadie que te reanude:
- No corras `tests/run.sh` ni lances trabajos en segundo plano. Corre en primer plano
  sólo esa suite.
- No termines tu turno esperando una notificación: al terminar tu turno el ítem se
  cierra y lo que no esté escrito se pierde.

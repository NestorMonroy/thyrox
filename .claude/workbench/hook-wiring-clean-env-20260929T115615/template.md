Corriges H-THYROX-268: el cableado de hooks que emite `src/session/user_wiring.py`
(`declared_wiring`) depende del `PYTHONPATH` de quien lo instaló. El `Item:` de abajo
nombra los archivos que te pertenecen; no toques ningún otro, y nada bajo `.claude/`.
Edita con `sed`, `gawk` o `bash bin/replace_literal`. Identificadores en inglés,
comentarios en español.

Lo medido (2026-09-29):
- `declared_wiring` cablea `python3 <base>/src/hooks/task_lifecycle.py` (TaskCreated,
  TaskCompleted) y `python3 <base>/src/agents/register_session.py` (SubagentStart/Stop)
  sin `PYTHONPATH`. Invocados por ruta mueren con `ModuleNotFoundError: No module named
  'agents'` / `'hooks'`, exit 1. Efecto: una sesión entera sin escribir `tasks` ni
  `agent_sessions` (289 tarjetas y 26 subagentes, reconciliados a mano).
- `measure_delta.py` arranca hoy, pero por casualidad: nada garantiza que siga así.
- `PreToolUse` y `SessionStart:compact` funcionan porque anteponen
  `PYTHONPATH=<base>/src`.
- `bin/` ya trae envoltorios generados (`bin/task_lifecycle`, `bin/register_session`,
  `bin/measure_delta`, `bin/compact_context`, `bin/tool_use_preflight`) que resuelven
  `THYROX_ROOT`, el intérprete del proveedor y el `PYTHONPATH` por sí mismos.

Qué haces:
1. Todo comando Python que emite `declared_wiring` pasa por su envoltorio de `bin/`
   (`bash <base>/bin/<nombre> ...`), no por `python3 <ruta>.py` ni por un
   `PYTHONPATH=` antepuesto. Mismos argumentos que hoy. Si algún comando no tiene
   envoltorio, dilo y déjalo con `PYTHONPATH=<base>/src` explícito, no lo inventes.
2. Una sección nueva en `tests/session/test_user_wiring.py` que mide la PROPIEDAD
   GENERAL, no los dos nombres: recorre TODOS los comandos de `declared_wiring` (por
   evento, sin lista escrita a mano de nombres de hook) y ejecuta cada uno en un entorno
   mínimo —`env -i` con sólo `PATH` y un `HOME` temporal, sin `PYTHONPATH`— con un
   payload inerte por stdin (`{}` o el mínimo del evento), con timeout. Aserción: ningún
   comando produce `ModuleNotFoundError` ni `ImportError` en su salida.
   AISLAMIENTO OBLIGATORIO: la prueba no puede escribir en el store real, en los repos
   reales ni en `~/.claude`. Llama a `declared_wiring` con `consumer=` un directorio
   temporal; pasa las variables de destino que los mecanismos ya leen
   (`AGENT_STORE_CLAUDE_DIR`, `THYROX_AGENT_STORE`, `THYROX_JOBS_DIR`, las de hogar de
   `.env.example`) apuntando a temporales. Un comando que actúa sobre un repo
   (`item_worktree sweep-orphans <repo>`) recibe un repo git temporal, nunca uno real.
   Si un comando no se puede aislar, exclúyelo con su razón escrita en la prueba y
   dilo: nunca lo corras contra lo real.
3. Control de anulación: devuelve temporalmente `task_lifecycle` a `python3
   <base>/src/hooks/task_lifecycle.py` y corre la sección: tiene que caer exactamente
   ese comando (sus dos eventos), no los demás. Restaura y publica los conteos.

Cierre del ítem (obligatorio):
- Todo en primer plano; sin trabajos en segundo plano ni `git stash`.
- NO ejecutes `user_wiring.py --write` ni toques `~/.claude/settings*.json`: instalar
  el cableado vivo lo hace el orquestador tras integrar.
- Tu mensaje final incluye el rojo inicial de la sección nueva, el verde de
  `PYTHONPATH=src uv run --python 3.12 python tests/session/test_user_wiring.py` (así la
  corre `tests/run.sh`; la sección nueva quita ese `PYTHONPATH` en cada comando que ejecuta), la lista de comandos
  medidos y excluidos, y el control de anulación con conteos.

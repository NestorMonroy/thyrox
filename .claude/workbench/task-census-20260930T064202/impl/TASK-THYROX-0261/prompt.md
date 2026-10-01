# TASK-THYROX-0261

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p11-loose.md`

## La tarea

## [56] TASK-THYROX-0261 — Decidir el consumidor por defecto de user_wiring.declared_wiring

Status on board: pending

user_wiring.py:100 usa base.parent / "kaupamex-docs" cuando no se declara consumidor, y main() no ofrece --consumidor. reach.consumer_root() rehúsa desde el proveedor y desde /home/user el ascenso tomaría el home por consumidor (tiene .claude/). Elegir la cadena: parámetro → THYROX_CONSUMER → invocador → rehúso nombrando la variable; añadir --consumer a main y medir qué invoca install() hoy.

## Estado medido por el censo: pendiente

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- literal `kaupamex-docs` como consumidor por defecto sigue vivo: src/session/user_wiring.py:100 (`consumer = Path(consumer) if consumer else base.parent / "kaupamex-docs"`) — `grep -n kaupamex-docs src/session/user_wiring.py`
- el comentario de user_wiring.py:97 cita la tarea como barrido futuro, no como hecho — `git grep -n TASK-THYROX-0261 -- src`; el único commit que la toca es 5896624b4 (2026-09-27, sólo renombra `#249` → `TASK-THYROX-0261` en ese comentario) — `git log --oneline -S'TASK-THYROX-0261' -- src/session/user_wiring.py`
- main() no ofrece `--consumer`: sus opciones son --write, --backups, --allow-cache-key-change, --hooks-only — `sed -n '/^def main/,$p' src/session/user_wiring.py | grep -c consumer` → 0
- user_wiring.py no lee THYROX_CONSUMER — `git grep -n THYROX_CONSUMER -- src/session/user_wiring.py` → 0 hits; la variable ya existe como `CONSUMER_ROOT_VAR` en src/paths/reach.py:938 y `reach.consumer_root()` (reach.py:1029) ya implementa `declarado → THYROX_CONSUMER/THYROX_ENV_FILE → ascenso`, con rehúso desde el proveedor sólo bajo THYROX_CONSUMER_STRICT (reach.py:967)
- quién invoca install() hoy: un solo sitio, main() con --write (src/session/user_wiring.py:707), que llama `declared_wiring()` sin consumer (:698) — `git grep -n 'install(' -- src/session/user_wiring.py`; `bin/user_wiring --write` lo cita session_restart.py:321,355 y el envoltorio bin/user_wiring:27 hace exec del módulo
- el otro invocador de declared_wiring, src/session/instalar-hooks-sesion-multirepo.sh:80-84, ya pasa `consumer=` explícito (`--consumidor` o la raíz por defecto, :13,:39) — `sed -n 60,95p src/session/instalar-hooks-sesion-multirepo.sh`
- la suite existente tiene un solo caso con `consumer=` (tests/session/test_user_wiring.py:775) y ninguno para el rehúso ni para THYROX_CONSUMER — `grep -n 'consumer=' tests/session/test_user_wiring.py`
- árbol sin cambios tras medir — `git status --short` vacío

## Lo que falta — tu alcance

- reemplazar en declared_wiring() (src/session/user_wiring.py:100) el literal `base.parent / "kaupamex-docs"` por la cadena parámetro → THYROX_CONSUMER (reach.CONSUMER_ROOT_VAR / env_value) → invocador → rehúso (WiringRefused o ConsumerUnknownError) que nombre THYROX_CONSUMER
- añadir `--consumer` a main() y pasarlo a declared_wiring() en la rama --write (:698) y en la rama de medición (:733); que el rehúso salga como `REHUSA — …` con exit 2 en las dos ramas
- decidir y documentar qué significa «invocador» cuando el cwd es /home/user (el ascenso de reach.consumer_root tomaría el home, que tiene .claude/): la tarea pide que ese caso rehúse en vez de adivinar
- actualizar el comentario de :95-99 que hoy declara el literal como DEFAULT y cita esta tarea como pendiente
- casos de prueba en tests/session/test_user_wiring.py: parámetro gana a variable; variable sola resuelve; sin ninguna y sin invocador válido rehúsa nombrando THYROX_CONSUMER; control de anulación (retirar el rehúso y que caiga exactamente ese caso)
- revisar si instalar-hooks-sesion-multirepo.sh y session_restart.py (--write) necesitan propagar --consumer/THYROX_CONSUMER

## Archivos que te pertenecen

- src/session/user_wiring.py
- tests/session/test_user_wiring.py
- src/session/session_restart.py
- src/session/instalar-hooks-sesion-multirepo.sh

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- PYTHONDONTWRITEBYTECODE=1 timeout 300 python3 tests/session/test_user_wiring.py → 93 ok, 2 fallos; los 2 fallos (casos 1b «sin PYTHONPATH») son del entorno del worktree sin `uv sync` (bin/tool_use_preflight y bin/compact_context rehúsan por falta de .venv), no de esta tarea
- por escribir: casos de resolución del consumidor en tests/session/test_user_wiring.py (parámetro > THYROX_CONSUMER > invocador > rehúso, con anulación)

## Dependencias

- decisión de diseño sobre la cadena de resolución y sobre si el ascenso desde /home/user debe rehusar (la tarea la pide; reach.consumer_root ya ofrece THYROX_CONSUMER_STRICT como precedente opt-in)

## Decisión del ejecutor (ya tomada; gobierna sobre la pregunta de diseño)

Registrada en `.claude/workbench/decisiones-ejecutor-siete-tareas-20260930T044345/README.md` como [56]:
`user_wiring` resuelve el consumidor por `reach`/contexto; si no puede resolverlo, **rehúsa**.
Ningún consumidor escrito a mano en el código. Léela entera antes de empezar.

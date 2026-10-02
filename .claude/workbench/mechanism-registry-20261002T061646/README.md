# mechanism-registry — TASK-THYROX-0769

## El encargo

<!-- verbatim, sin parafrasear -->
> Implementa la pieza mínima reusable de Thyrox, no un buscador inteligente. [...] El buscador NO decide
> por sí mismo REUSE/EXTEND/MISSING. Su salida es solamente: FOUND RELATED NONE. [...] No quiero un TSV
> que pueda quedar stale silenciosamente. [...] Si Thyrox ya tiene un registry/checker declarativo
> apropiado, reutilízalo antes de crear otro. [...] Cuando esté hecho, usa el nuevo mecanismo
> inmediatamente sobre P2d/P2e/P3 y dame esta tabla: requisito | mecanismo encontrado |
> REUSE/EXTEND/MISSING | acción.
> — el ejecutor, 2026-10-02. Y en el mismo turno: «no system python3, tiene que ser con uv».

## La premisa, si se corrigio al primer comando

- Ningún registro declarativo existente puede alojarlo (`control_plane_entries.tsv`,
  `reachability-matrix.tsv`, `layer_signals.tsv`, `env_sensitivity.tsv`: dominios ajenos).
- Sí existen piezas que se reutilizan en vez de reconstruir: `src/verify/registry.py` (el patrón «registro
  único + control que obliga a registrar»), `src/verify/reader.py` (qué símbolos declara un archivo) y el
  plan de `bin/generate_bin --list` (qué entradas públicas existen).
- El control de `registry.py` ya estaba rojo en HEAD: 8 gates en disco sin registrar
  (`PYTHONPATH=src uv run --frozen --no-sync python tests/verify/test_runner.py`). T001 los registra.
- Un worktree no trae `.venv`; los envoltorios de `bin/` caerían al python3 del sistema. `verify/uv_env.sh`
  le da el `.venv` de uv del clon principal sólo si el `uv.lock` es idéntico (`package = false`: el `.venv`
  sólo tiene dependencias), o rehúsa. Medido: enlaza con lock igual (exit 0), rehúsa con lock distinto (2).

## Las piezas

| archivo | que hace |
|---|---|
| `tasks/T001.md`, `tasks/T002.md` | contratos de cada ítem con los apartados del contrato de N tareas |
| `item-T00N-prompt.md` | lo que recibe el trabajador; nombra su tarea |
| `plan.jsonl` | dos ítems en worktree propio, T002 depende de T001; sólo qwen3.8-flash y deepseek-v4.1-flash |
| `verify/T00N.sh` | verificación en el worktree: pruebas, pruebas negativas propias, alcance y RED contra la base |
| `verify/uv_env.sh` | el intérprete de uv en un árbol de trabajo, o rehúsa |

## Los resultados

*Metrica:*
*Ciega a:*

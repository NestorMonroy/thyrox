# Rojo de partida — subsistema TASK tras la mudanza a thyrox
# Medido 2026-09-06T21:37:41 sobre 274e11d1

## Codigo de salida REAL (sin pipe: un $? tras 'tail' mide tail)
  EXIT=1 tests/legacy/test_task_ids.py
  EXIT=1 tests/legacy/test_task_source_citas.py
  EXIT=1 tests/legacy/test-closure-graph.sh
  EXIT=1 tests/legacy/test-implementation-order.sh

## El ancla que rompio — hogar viejo, literal
tests/legacy/test_task_ids.py:39:MODULE_PATH = HERE.parent / "task" / "task_ids.py"
tests/legacy/test_task_source_citas.py:42:MODULE_PATH = HERE.parent / "task" / "task_source.py"
tests/legacy/test-closure-graph.sh:31:SCRIPT=.claude/scripts/task/closure_graph.py
tests/legacy/test-closure-graph.sh:168:sys.path.insert(0, '.claude/scripts/task')
tests/legacy/test-implementation-order.sh:40:GUION=.claude/scripts/task/implementation_order.py

## Contraste: el objetivo SI existe en su hogar nuevo
src/task/closure_graph.py
src/task/implementation_order.py
src/task/task_ids.py
src/task/task_source.py

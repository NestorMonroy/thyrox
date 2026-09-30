#!/usr/bin/env python3
"""Los renombres que la tabla palabra-a-palabra no puede resolver sola.

Cada uno es una COLISION real: la traduccion directa ya nombra OTRO simbolo en
el mismo ambito, asi que renombrar fusionaria dos cosas distintas. La salida no
es buscar un sinonimo —eso es lo que `redaccion-tecnica-es.md` prohibe— sino
**traducir la palabra y calificarla con su papel**, que es informacion del
sitio y no del diccionario: `fila` dentro de un bucle cuyo `row` ya existe es
el registro que se compone con esa fila, luego `record`.

Por eso viven aqui, con su sitio, y no en el lexico: el lexico traduce
palabras y esto decide nombres.
"""

#: (ruta, nombre viejo) -> nombre nuevo.
OVERRIDES = {
    ('src/agents/agent_store.py', 'suma'): 'bucket_sum',
    ('src/hooks/detect_topic_duplication.py', 'ordenados'): 'sorted_hits',
    ('src/session/job_runs.py', 'ordenadas'): 'sorted_durations',
    ('src/task/board_sync.py', 'entrada'): 'board_entry',
    ('src/task/board_sync.py', 'fila'): 'record',
    ('src/verify/verificar_premisa.py', 'raiz'): 'root_dir',
    ('src/verify/writer_census.py', 'desde'): 'since',
    ('tests/agents/test_final_message_closing.py', 'etiqueta'): 'case_label',
    ('tests/agents/test_final_message_closing.py', 'ruta'): 'jsonl_path',
    ('tests/docs/test_initiative_placement.py', 'raiz'): 'root_dir',
    ('tests/docs/test_scaffold_initiative.py', 'raiz'): 'root_dir',
    ('tests/docs/test_scaffold_initiative.py', 'cuerpo'): 'template_body',
    ('tests/hooks/test_detect_code_language.py', '_RAIZ'): '_TREE_ROOT',
    ('tests/hooks/test_detect_narrative_continuity.py', 'anterior'): 'prior',
    ('tests/measurement/test_trend.py', 'recta'): 'straight_line',
    ('tests/session/test_marker_wait.py', 'etiqueta'): 'case_label',
    ('tests/verify/test_writer_census.py', 'con'): 'with_resolution',
}

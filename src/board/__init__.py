"""La capa de consulta del tablero de tareas.

Las funciones operan sobre un **grafo**, no sobre una base de datos. Esa
separación es lo que las hace comprobables sin store y reusables por cualquier
consumidor: quien tenga las aristas puede preguntar, venga de donde venga.
"""

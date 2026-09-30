"""Control post-barrido de `exercise_entrypoints`.

El mismo veredicto que la linea base tiene que salir despues: es lo que
discrimina «el barrido no rompio ninguna puerta» de «las rompio y nadie lo vio».

No usa `sys.path.insert`: la raiz llega por `PYTHONPATH`, que es el invariante
que hace redundantes los inserts que este barrido retira.
"""
import json
import pathlib

from session.generate_bin import exercise_entrypoints

root = pathlib.Path(__file__).resolve().parents[3]
failures = exercise_entrypoints(root)
print(json.dumps(failures, indent=2, ensure_ascii=False, default=str)[:2000])
print(f"--- fallos: {len(failures)}")

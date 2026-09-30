"""Linea base de `exercise_entrypoints` ANTES del barrido.

El mismo N tiene que pasar despues: es el control que discrimina «el barrido
no rompio ninguna puerta» de «el barrido rompio puertas y nadie lo vio».
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / "src"))
from session.generate_bin import exercise_entrypoints  # noqa: E402

root = pathlib.Path(__file__).resolve().parents[3]
result = exercise_entrypoints(root)
print(json.dumps(result, indent=2, ensure_ascii=False, default=str)[:400])

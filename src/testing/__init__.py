"""Soporte de pruebas del proveedor, importable con `PYTHONPATH=src`.

Vive en `src/` y no en `tests/` porque el runner solo exporta `src` al
`PYTHONPATH`: una utilidad compartida bajo `tests/` obligaria a cada suite a
un `sys.path.insert`, que es lo que TASK-THYROX-0018 esta retirando.
"""

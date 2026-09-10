"""Lectura del transcript JSONL de una sesión.

Cada línea es un objeto con su ``type`` y su ``message``. Lo que este paquete
resuelve es **de quién** es cada línea: separar lo que una persona tecleó de lo
que el harness inyectó, que el formato declara y ningún consumidor leía.
"""

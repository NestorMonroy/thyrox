"""El cache de trabajo-ya-hecho: dos escalones sobre un conjunto de archivos.

Subsistema hermano de ``src/session`` y ``src/workbench``. Vive aqui y no en
``src/verify`` ni en ``src/corpus`` porque esos dos son sus CONSUMIDORES: el
mecanismo es generico sobre (conjunto de archivos con stat, funcion pura del
contenido), y un gate concreto es un caso de uso, no su hogar.
"""

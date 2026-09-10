"""Consultas sobre el estado de un repositorio git.

Se llama ``repo`` y no ``git`` a propósito: ``src`` se antepone a ``sys.path``,
así que un paquete nuestro llamado ``git`` sombrearía a GitPython para todo el
proceso. No está instalada hoy —medido— y ése es el momento de no plantar la
colisión, no el de descubrirla.
"""

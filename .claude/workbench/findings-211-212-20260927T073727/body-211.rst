Evidencia
---------

``.githooks/pre-commit`` armaba la lista con
``git diff --cached --name-only --diff-filter=ACM``. El estado ``R`` quedaba
fuera, así que un commit hecho sólo de ``git mv`` entregaba una lista vacía a
los gates que se disparan por ruta. En ``thyrox@4357a89f`` (23 renombres) el
gate de frontera de paquete no imprimió nada; corrido a mano dio 0 cruces.

*Métrica:* si el espía de ``package_boundary.py`` se invoca en un repo
temporal cuyo único cambio staged es un renombre.
*Ciega a:* los gates que no se disparan por ruta, que ya corrían.

Control de anulación: con ``ACM`` cae exactamente la aserción del renombre
(``tests/githooks/test-pre-commit-renamed-paths.sh``).

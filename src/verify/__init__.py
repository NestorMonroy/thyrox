"""Gates de THYROX — controles mecánicos que miden un árbol y publican su alcance.

Un gate de este paquete mide **los clones**, no el repo en que vive: por eso
resuelve sus raíces con ``paths.reach`` y nunca deriva una ruta por su cuenta.
Un gate con su propia copia de la ruta es una segunda fuente de verdad, y su
modo de fallo es silencioso — apuntado a una raíz vacía publica «0
incumplidores» y parece sano.
"""

Qué estaba mal
--------------

La búsqueda de un literal en el bundle vendorizado se hacía con ``rg``
sobre ``bunfs-root/``. ``rg`` trata como binario un archivo con bytes NUL
y, sin ``-a``, lo salta sin avisar. Un cero sobre esa búsqueda no
distinguía «el literal no está» de «el chunk no se leyó»: el sub-patrón D
de ``metrica-decide-la-conclusion.md``.

Qué se hizo
-----------

``bin/binary literal <texto>`` recorre todos los chunks, devuelve la
declaración de nivel superior que contiene el literal y publica el
denominador (chunks medidos y chunks con el literal).

Control de anulación: contar un chunk sin exigir que la coincidencia
caiga en código cae el caso del literal que sólo vive en un comentario.

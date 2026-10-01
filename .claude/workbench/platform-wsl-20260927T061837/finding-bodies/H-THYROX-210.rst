Qué estaba mal
--------------

``bin/binary symbol`` baja de un uso a su definición. No había dirección
inversa, así que para saber quién usa un mecanismo se buscaba su literal;
lo que no estaba junto al literal no se veía (:ref:`h-thyrox-208`). En un
bundle minificado el mismo símbolo se importa con otro nombre local en cada
chunk, así que tampoco sirve buscar su nombre.

Qué se hizo
-----------

``bin/binary references <chunk> <nombre>`` sigue el alias con que el chunk
exporta el símbolo y el nombre local con que cada chunk lo importa, y da
por uso la declaración que lo contiene y el miembro que llama
(``x.m`` y ``x().m``).

Control de anulación: buscar el nombre exportado en vez del alias local cae
los casos 1 y 4; saltarse el propio chunk cae los mismos dos. El caso 2
(un homónimo de otro export no cuenta) no depende de ninguno.

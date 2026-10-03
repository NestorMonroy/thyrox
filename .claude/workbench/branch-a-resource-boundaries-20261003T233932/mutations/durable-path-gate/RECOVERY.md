# Anulación del gate de rutas durables — sin tocar el árbol de trabajo

Se muta una COPIA bajo `tree/`; los archivos del producto no cambian, así que
no hay estado que restaurar si la sesión se recicla a mitad. `tree/src/session`
es un enlace de sólo lectura al paquete real (lo importa el caso 1).

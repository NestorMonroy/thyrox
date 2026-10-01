Implementas en thyrox (bash), en TDD, la ayuda de `bin/parallel_map`. El `Item:` de abajo nombra los
archivos que te pertenecen; no toques ningún otro. Edita con `sed`, `gawk` o `bash bin/replace_literal`.

El defecto, medido: `bash bin/parallel_map --help` imprime «REHUSA — no se declaró la fuente de
ítems» y sale 2. `src/session/parallel_map.sh` no reconoce `--help` y lo trata como el comando.

Lo que se pide:
1. Mitad roja primero, en `tests/session/test-parallel-map.sh`: casos para `--help` y `-h` como PRIMER
   argumento → salida estándar con la línea `Uso:` y la forma `parallel_map [--width N]`, exit 0, sin
   lanzar GNU Parallel (el caso debe pasar con `THYROX_TOOLCHAIN_PARALLEL_BIN` apuntando a un binario
   inexistente). Y un caso de que `--help` DESPUÉS del comando se entrega al comando, no a la
   herramienta: `parallel_map echo --help ::: a` imprime `--help a`.
2. Arreglo en `src/session/parallel_map.sh`: la ayuda sale de la cabecera del propio archivo (las
   líneas de comentario desde la descripción hasta el párrafo de salida), no de una copia en un
   `heredoc`: una segunda copia del uso se desincroniza.
3. Control de anulación: retirar el reconocimiento de `--help` hace caer exactamente los casos de
   ayuda y no el de paso al comando; publica el conteo antes y después. Restaura.
4. Comentarios en español sin coloquialismos; identificadores en inglés.

Criterio de cierre: `bash tests/session/test-parallel-map.sh` en verde.

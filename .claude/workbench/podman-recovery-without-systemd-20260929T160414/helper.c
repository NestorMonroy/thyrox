/* Ayudante estatico del banco de recuperacion de Podman sin systemd.
 *   serve          -> duerme para siempre (el proceso principal del contenedor)
 *   check <ruta>   -> sale 0 si la ruta existe, 1 si no (comando de healthcheck)
 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main(int argc, char **argv) {
    if (argc >= 2 && strcmp(argv[1], "serve") == 0) {
        for (;;) pause();
    }
    if (argc >= 3 && strcmp(argv[1], "check") == 0) {
        return access(argv[2], F_OK) == 0 ? 0 : 1;
    }
    fprintf(stderr, "uso: helper serve | helper check <ruta>\n");
    return 2;
}

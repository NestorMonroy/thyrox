/* Ayudante estático de la fase 2b: cada modo imprime una línea «clave=valor» y sale 0. */
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/times.h>
#include <time.h>
#include <unistd.h>

static void *spin(void *arg) { volatile unsigned long x = 0; time_t end = time(NULL) + *(int *)arg; while (time(NULL) < end) x++; return NULL; }

int main(int argc, char **argv) {
  const char *mode = argc > 1 ? argv[1] : "";
  if (!strcmp(mode, "net")) {
    /* Conectar por TCP a una IP pública: sin DNS, para medir la red y no el resolvedor. */
    int s = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in a = { .sin_family = AF_INET, .sin_port = htons(443) };
    inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);
    struct timeval tv = { 3, 0 };
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof tv);
    int rc = s < 0 ? -1 : connect(s, (struct sockaddr *)&a, sizeof a);
    printf("net_connect=%s errno=%s\n", rc == 0 ? "ok" : "fail", rc == 0 ? "-" : strerror(errno));
  } else if (!strcmp(mode, "write")) {
    int fd = open(argc > 2 ? argv[2] : "/probe-write", O_CREAT | O_WRONLY, 0644);
    printf("write=%s errno=%s\n", fd >= 0 ? "ok" : "fail", fd >= 0 ? "-" : strerror(errno));
  } else if (!strcmp(mode, "read")) {
    int fd = open(argv[2], O_RDONLY);
    printf("read=%s errno=%s\n", fd >= 0 ? "ok" : "fail", fd >= 0 ? "-" : strerror(errno));
  } else if (!strcmp(mode, "cpu")) {
    /* Dos hilos girando N s: el cociente CPU/pared dice cuántos núcleos obtuvo el contenedor. */
    int secs = 3; pthread_t t1, t2; struct tms t0, t9; long hz = sysconf(_SC_CLK_TCK);
    clock_t w0 = times(&t0);
    pthread_create(&t1, NULL, spin, &secs); pthread_create(&t2, NULL, spin, &secs);
    pthread_join(t1, NULL); pthread_join(t2, NULL);
    clock_t w9 = times(&t9);
    double cpu = (double)(t9.tms_utime - t0.tms_utime + t9.tms_stime - t0.tms_stime) / hz;
    double wall = (double)(w9 - w0) / hz;
    printf("cpu_ratio=%.2f cpu_s=%.2f wall_s=%.2f\n", cpu / wall, cpu, wall);
  } else { printf("unknown=%s\n", mode); }
  return 0;
}

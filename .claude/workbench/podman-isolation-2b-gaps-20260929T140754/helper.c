/* Ayudante estático de la fase 2b (huecos): cada modo imprime una línea «clave=valor» y sale 0. */
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
    /* argv[2] = número de hilos (1 a 8; por omisión 2): el techo sin límite es ese número. */
    int secs = 3, n = argc > 2 ? atoi(argv[2]) : 2; if (n < 1 || n > 8) n = 2;
    pthread_t th[8]; struct tms t0, t9; long hz = sysconf(_SC_CLK_TCK);
    clock_t w0 = times(&t0);
    for (int i = 0; i < n; i++) pthread_create(&th[i], NULL, spin, &secs);
    for (int i = 0; i < n; i++) pthread_join(th[i], NULL);
    clock_t w9 = times(&t9);
    double cpu = (double)(t9.tms_utime - t0.tms_utime + t9.tms_stime - t0.tms_stime) / hz;
    double wall = (double)(w9 - w0) / hz;
    printf("threads=%d cpu_ratio=%.2f cpu_s=%.2f wall_s=%.2f\n", n, cpu / wall, cpu, wall);
  } else if (!strcmp(mode, "net6")) {
    /* TCP a una IPv6 pública fija: la red, no el resolvedor. */
    int s = socket(AF_INET6, SOCK_STREAM, 0);
    struct sockaddr_in6 a = { .sin6_family = AF_INET6, .sin6_port = htons(443) };
    inet_pton(AF_INET6, "2606:4700:4700::1111", &a.sin6_addr);
    struct timeval tv = { 3, 0 };
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof tv);
    int rc = s < 0 ? -1 : connect(s, (struct sockaddr *)&a, sizeof a);
    printf("net6_connect=%s errno=%s\n", rc == 0 ? "ok" : "fail", rc == 0 ? "-" : strerror(errno));
  } else if (!strcmp(mode, "dns")) {
    /* Una consulta DNS mínima (A de example.com) por UDP a 1.1.1.1:53: ¿sale y vuelve? */
    unsigned char q[] = {0x12,0x34,1,0,0,1,0,0,0,0,0,0,7,'e','x','a','m','p','l','e',3,'c','o','m',0,0,1,0,1};
    int s = socket(AF_INET, SOCK_DGRAM, 0);
    struct sockaddr_in a = { .sin_family = AF_INET, .sin_port = htons(53) };
    inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);
    struct timeval tv = { 3, 0 };
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof tv);
    ssize_t sent = s < 0 ? -1 : sendto(s, q, sizeof q, 0, (struct sockaddr *)&a, sizeof a);
    int send_errno = errno;
    unsigned char r[512]; ssize_t got = sent < 0 ? -1 : recv(s, r, sizeof r, 0);
    printf("dns_send=%s dns_answer=%s errno=%s\n", sent >= 0 ? "ok" : "fail", got > 0 ? "ok" : "fail",
           sent < 0 ? strerror(send_errno) : (got > 0 ? "-" : strerror(errno)));
  } else { printf("unknown=%s\n", mode); }
  return 0;
}

/*
 * Addon N-API para el modo de captura TPROXY.
 *
 * El módulo net no puede hacer setsockopt(IP_TRANSPARENT) antes de bind(), y
 * sin eso el kernel descarta los paquetes redirigidos. Este addon crea el
 * socket transparente y, además, lo usa él mismo: Bun no adopta descriptores
 * de socket (ni listen({ fd }) ni net.Socket({ fd })), así que la conexión no
 * se entrega a JavaScript como fd sino por loopback, con una cabecera PROXY v1.
 *
 *   createTransparentListener(ip, puerto)  -> fd a la escucha, IP_TRANSPARENT
 *   setSocketMark(fd, marca)               -> SO_MARK en un socket existente
 *   connectMarked(ip, puerto, marca)       -> fd conectándose con SO_MARK puesto
 *   startTransparentBridge(ip, puerto, destinoLocal)
 *       acepta en el socket transparente; por cada conexión lee el destino
 *       original con getsockname (TPROXY lo conserva), conecta a
 *       127.0.0.1:destinoLocal, escribe "PROXY TCP4 ..." y retransmite
 *   startMarkedEgress(marca) -> { handle, port }
 *       escucha en 127.0.0.1 (puerto efímero); por cada conexión lee la
 *       cabecera PROXY, conecta al destino que nombra con SO_MARK puesto antes
 *       del connect (el SYN ya lleva la marca, y la regla de OUTPUT no lo
 *       vuelve a interceptar) y retransmite
 *   stopRelay(handle), relayStats(handle) -> { accepted, rejectedHeaders, lastUpstreamMark }
 *
 * Todo lo que toca IP_TRANSPARENT o SO_MARK necesita CAP_NET_ADMIN.
 *
 * Porte de omniroute: src/mitm/tproxy/native/transparent.c (MIT); el puente,
 * la salida marcada y sus controles son propios de thyrox.
 */
#include <node_api.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <arpa/inet.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <pthread.h>

#define THROW(env, code, msg) do { napi_throw_error((env), (code), (msg)); return NULL; } while (0)
#define MAX_RELAYS 64
#define PROXY_MAX_LINE 107
#define RELAY_BUFFER 16384
#define STOP_POLL_MS 200

enum relay_kind { RELAY_BRIDGE = 0, RELAY_EGRESS = 1 };

struct relay {
  int in_use;
  enum relay_kind kind;
  int listen_fd;
  int target_port;
  int mark;
  volatile int stopping;
  volatile long accepted;
  volatile long rejected_headers;
  volatile int last_upstream_mark;
  pthread_t thread;
};

static struct relay relays[MAX_RELAYS];
static pthread_mutex_t relays_lock = PTHREAD_MUTEX_INITIALIZER;

struct connection {
  struct relay *relay;
  int client_fd;
};

/* Escribe todo el búfer; falso si el otro extremo se cerró. */
static int write_all(int fd, const char *data, size_t length) {
  while (length > 0) {
    ssize_t written = send(fd, data, length, MSG_NOSIGNAL);
    if (written < 0) {
      if (errno == EINTR) continue;
      return 0;
    }
    data += written;
    length -= (size_t)written;
  }
  return 1;
}

/*
 * Copia en los dos sentidos hasta que ambos lados cierran. El fin de un lado
 * se propaga con shutdown(SHUT_WR) al otro, para que una petición a medias
 * reciba su respuesta completa.
 */
static void relay_bytes(int a, int b) {
  char buffer[RELAY_BUFFER];
  int a_open = 1, b_open = 1;
  while (a_open || b_open) {
    struct pollfd fds[2] = {
      { .fd = a_open ? a : -1, .events = POLLIN },
      { .fd = b_open ? b : -1, .events = POLLIN },
    };
    if (poll(fds, 2, -1) < 0) {
      if (errno == EINTR) continue;
      break;
    }
    for (int i = 0; i < 2; i++) {
      if (!(fds[i].revents & (POLLIN | POLLHUP | POLLERR))) continue;
      int from = i == 0 ? a : b;
      int to = i == 0 ? b : a;
      ssize_t n = recv(from, buffer, sizeof(buffer), 0);
      if (n > 0 && write_all(to, buffer, (size_t)n)) continue;
      shutdown(to, SHUT_WR);
      if (i == 0) a_open = 0; else b_open = 0;
    }
  }
  close(a);
  close(b);
}

static int connect_loopback(int port) {
  int fd = socket(AF_INET, SOCK_STREAM, 0);
  if (fd < 0) return -1;
  struct sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons((uint16_t)port);
  addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
  if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
    close(fd);
    return -1;
  }
  return fd;
}

static void *bridge_connection(void *arg) {
  struct connection *conn = arg;
  struct sockaddr_in dst, src;
  socklen_t dst_len = sizeof(dst), src_len = sizeof(src);
  int upstream = -1;
  if (getsockname(conn->client_fd, (struct sockaddr *)&dst, &dst_len) == 0 &&
      getpeername(conn->client_fd, (struct sockaddr *)&src, &src_len) == 0) {
    upstream = connect_loopback(conn->relay->target_port);
  }
  if (upstream < 0) {
    close(conn->client_fd);
    free(conn);
    return NULL;
  }
  char src_ip[INET_ADDRSTRLEN], dst_ip[INET_ADDRSTRLEN], header[PROXY_MAX_LINE + 1];
  inet_ntop(AF_INET, &src.sin_addr, src_ip, sizeof(src_ip));
  inet_ntop(AF_INET, &dst.sin_addr, dst_ip, sizeof(dst_ip));
  int length = snprintf(header, sizeof(header), "PROXY TCP4 %s %s %u %u\r\n", src_ip, dst_ip,
                        ntohs(src.sin_port), ntohs(dst.sin_port));
  if (length > 0 && write_all(upstream, header, (size_t)length)) {
    relay_bytes(conn->client_fd, upstream);
  } else {
    close(upstream);
    close(conn->client_fd);
  }
  free(conn);
  return NULL;
}

/* Lee la línea PROXY byte a byte, para no consumir nada de lo que sigue. */
static int read_proxy_line(int fd, char *line, size_t size) {
  size_t used = 0;
  while (used + 1 < size) {
    char c;
    ssize_t n = recv(fd, &c, 1, 0);
    if (n <= 0) return 0;
    line[used++] = c;
    if (used >= 2 && line[used - 2] == '\r' && line[used - 1] == '\n') {
      line[used - 2] = '\0';
      return 1;
    }
  }
  return 0;
}

static void *egress_connection(void *arg) {
  struct connection *conn = arg;
  char line[PROXY_MAX_LINE + 1], src_ip[16], dst_ip[16];
  unsigned src_port, dst_port;
  int upstream = -1;
  struct sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  int valid = read_proxy_line(conn->client_fd, line, sizeof(line)) &&
              sscanf(line, "PROXY TCP4 %15s %15s %u %u", src_ip, dst_ip, &src_port, &dst_port) == 4 &&
              dst_port > 0 && dst_port <= 65535 && inet_pton(AF_INET, dst_ip, &addr.sin_addr) == 1;
  if (valid) {
    addr.sin_family = AF_INET;
    addr.sin_port = htons((uint16_t)dst_port);
    upstream = socket(AF_INET, SOCK_STREAM, 0);
  } else {
    conn->relay->rejected_headers++;
  }
  if (upstream >= 0) {
    int mark = conn->relay->mark, read_back = 0;
    socklen_t read_len = sizeof(read_back);
    if (setsockopt(upstream, SOL_SOCKET, SO_MARK, &mark, sizeof(mark)) < 0 ||
        getsockopt(upstream, SOL_SOCKET, SO_MARK, &read_back, &read_len) < 0 ||
        connect(upstream, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
      close(upstream);
      upstream = -1;
    } else {
      conn->relay->last_upstream_mark = read_back;
    }
  }
  if (upstream < 0) {
    close(conn->client_fd);
  } else {
    relay_bytes(conn->client_fd, upstream);
  }
  free(conn);
  return NULL;
}

/* El hilo que acepta; revisa la bandera de parada cada STOP_POLL_MS. */
static void *accept_loop(void *arg) {
  struct relay *relay = arg;
  while (!relay->stopping) {
    struct pollfd pfd = { .fd = relay->listen_fd, .events = POLLIN };
    int ready = poll(&pfd, 1, STOP_POLL_MS);
    if (ready <= 0 || relay->stopping) continue;
    int client = accept(relay->listen_fd, NULL, NULL);
    if (client < 0) continue;
    struct connection *conn = malloc(sizeof(*conn));
    if (!conn) {
      close(client);
      continue;
    }
    conn->relay = relay;
    conn->client_fd = client;
    relay->accepted++;
    pthread_t worker;
    void *(*handler)(void *) = relay->kind == RELAY_BRIDGE ? bridge_connection : egress_connection;
    if (pthread_create(&worker, NULL, handler, conn) != 0) {
      close(client);
      free(conn);
      continue;
    }
    pthread_detach(worker);
  }
  return NULL;
}

/* Crea el socket a la escucha; transparent decide si lleva IP_TRANSPARENT. */
static int open_listener(const char *ip, int port, int transparent, const char **error_code, int *error_number) {
  int fd = socket(AF_INET, SOCK_STREAM, 0);
  if (fd < 0) { *error_code = "ESOCKET"; *error_number = errno; return -1; }
  int one = 1;
  if (setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(one)) < 0) {
    *error_code = "ESO_REUSEADDR"; *error_number = errno; close(fd); return -1;
  }
  /* La opción que el módulo net no puede poner. Necesita CAP_NET_ADMIN. */
  if (transparent && setsockopt(fd, SOL_IP, IP_TRANSPARENT, &one, sizeof(one)) < 0) {
    *error_code = "EIP_TRANSPARENT"; *error_number = errno; close(fd); return -1;
  }
  struct sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons((uint16_t)port);
  if (inet_pton(AF_INET, ip, &addr.sin_addr) != 1) {
    *error_code = "EADDR"; *error_number = EINVAL; close(fd); return -1;
  }
  if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
    *error_code = "EBIND"; *error_number = errno; close(fd); return -1;
  }
  if (listen(fd, 511) < 0) {
    *error_code = "ELISTEN"; *error_number = errno; close(fd); return -1;
  }
  return fd;
}

static napi_value CreateTransparentListener(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  char ip[64] = {0};
  size_t ip_len = 0;
  napi_get_value_string_utf8(env, argv[0], ip, sizeof(ip), &ip_len);
  int32_t port = 0;
  napi_get_value_int32(env, argv[1], &port);
  const char *code = NULL;
  int error_number = 0;
  int fd = open_listener(ip, port, 1, &code, &error_number);
  if (fd < 0) THROW(env, code, error_number == EINVAL ? "invalid IPv4 address" : strerror(error_number));
  napi_value result;
  napi_create_int32(env, fd, &result);
  return result;
}

static napi_value SetSocketMark(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  int32_t fd = -1, mark = 0;
  napi_get_value_int32(env, argv[0], &fd);
  napi_get_value_int32(env, argv[1], &mark);
  if (setsockopt(fd, SOL_SOCKET, SO_MARK, &mark, sizeof(mark)) < 0) THROW(env, "ESO_MARK", strerror(errno));
  return NULL;
}

static napi_value ConnectMarked(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  char ip[64] = {0};
  size_t ip_len = 0;
  napi_get_value_string_utf8(env, argv[0], ip, sizeof(ip), &ip_len);
  int32_t port = 0, mark = 0;
  napi_get_value_int32(env, argv[1], &port);
  napi_get_value_int32(env, argv[2], &mark);
  int fd = socket(AF_INET, SOCK_STREAM, 0);
  if (fd < 0) THROW(env, "ESOCKET", strerror(errno));
  if (setsockopt(fd, SOL_SOCKET, SO_MARK, &mark, sizeof(mark)) < 0) {
    int e = errno; close(fd); THROW(env, "ESO_MARK", strerror(e));
  }
  int flags = fcntl(fd, F_GETFL, 0);
  if (flags < 0 || fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0) {
    int e = errno; close(fd); THROW(env, "EFCNTL", strerror(e));
  }
  struct sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons((uint16_t)port);
  if (inet_pton(AF_INET, ip, &addr.sin_addr) != 1) {
    close(fd); THROW(env, "EADDR", "invalid IPv4 address");
  }
  int r = connect(fd, (struct sockaddr *)&addr, sizeof(addr));
  if (r < 0 && errno != EINPROGRESS) {
    int e = errno; close(fd); THROW(env, "ECONNECT", strerror(e));
  }
  napi_value result;
  napi_create_int32(env, fd, &result);
  return result;
}

/* Reserva una ranura y arranca su hilo; -1 si no quedan ranuras o el hilo no arrancó. */
static int start_relay(enum relay_kind kind, int listen_fd, int target_port, int mark) {
  pthread_mutex_lock(&relays_lock);
  int handle = -1;
  for (int i = 0; i < MAX_RELAYS; i++) {
    if (!relays[i].in_use) { handle = i; break; }
  }
  if (handle >= 0) {
    struct relay *relay = &relays[handle];
    memset(relay, 0, sizeof(*relay));
    relay->in_use = 1;
    relay->kind = kind;
    relay->listen_fd = listen_fd;
    relay->target_port = target_port;
    relay->mark = mark;
    if (pthread_create(&relay->thread, NULL, accept_loop, relay) != 0) {
      relay->in_use = 0;
      handle = -1;
    }
  }
  pthread_mutex_unlock(&relays_lock);
  return handle;
}

static napi_value StartTransparentBridge(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  char ip[64] = {0};
  size_t ip_len = 0;
  napi_get_value_string_utf8(env, argv[0], ip, sizeof(ip), &ip_len);
  int32_t port = 0, target = 0;
  napi_get_value_int32(env, argv[1], &port);
  napi_get_value_int32(env, argv[2], &target);
  if (target <= 0 || target > 65535) THROW(env, "ETARGET", "target port must be 1-65535");
  const char *code = NULL;
  int error_number = 0;
  int fd = open_listener(ip, port, 1, &code, &error_number);
  if (fd < 0) THROW(env, code, error_number == EINVAL ? "invalid IPv4 address" : strerror(error_number));
  int handle = start_relay(RELAY_BRIDGE, fd, target, 0);
  if (handle < 0) { close(fd); THROW(env, "ERELAY", "no relay slot or thread available"); }
  napi_value result;
  napi_create_int32(env, handle, &result);
  return result;
}

static napi_value StartMarkedEgress(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  int32_t mark = 0;
  napi_get_value_int32(env, argv[0], &mark);
  if (mark <= 0) THROW(env, "EMARK", "mark must be a positive integer");
  const char *code = NULL;
  int error_number = 0;
  int fd = open_listener("127.0.0.1", 0, 0, &code, &error_number);
  if (fd < 0) THROW(env, code, strerror(error_number));
  struct sockaddr_in bound;
  socklen_t bound_len = sizeof(bound);
  if (getsockname(fd, (struct sockaddr *)&bound, &bound_len) < 0) {
    int e = errno; close(fd); THROW(env, "EGETSOCKNAME", strerror(e));
  }
  int handle = start_relay(RELAY_EGRESS, fd, 0, mark);
  if (handle < 0) { close(fd); THROW(env, "ERELAY", "no relay slot or thread available"); }
  napi_value result, handle_value, port_value;
  napi_create_object(env, &result);
  napi_create_int32(env, handle, &handle_value);
  napi_create_int32(env, ntohs(bound.sin_port), &port_value);
  napi_set_named_property(env, result, "handle", handle_value);
  napi_set_named_property(env, result, "port", port_value);
  return result;
}

static struct relay *relay_from(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  int32_t handle = -1;
  napi_get_value_int32(env, argv[0], &handle);
  if (handle < 0 || handle >= MAX_RELAYS || !relays[handle].in_use) return NULL;
  return &relays[handle];
}

/* Detiene el hilo que acepta y cierra el socket; las conexiones en curso terminan solas. */
static napi_value StopRelay(napi_env env, napi_callback_info info) {
  struct relay *relay = relay_from(env, info);
  if (!relay) return NULL;
  relay->stopping = 1;
  pthread_join(relay->thread, NULL);
  close(relay->listen_fd);
  pthread_mutex_lock(&relays_lock);
  relay->in_use = 0;
  pthread_mutex_unlock(&relays_lock);
  return NULL;
}

static napi_value RelayStats(napi_env env, napi_callback_info info) {
  struct relay *relay = relay_from(env, info);
  if (!relay) THROW(env, "ERELAY", "unknown relay handle");
  napi_value result, accepted, rejected, mark;
  napi_create_object(env, &result);
  napi_create_int64(env, relay->accepted, &accepted);
  napi_create_int64(env, relay->rejected_headers, &rejected);
  napi_set_named_property(env, result, "rejectedHeaders", rejected);
  napi_create_int32(env, relay->last_upstream_mark, &mark);
  napi_set_named_property(env, result, "accepted", accepted);
  napi_set_named_property(env, result, "lastUpstreamMark", mark);
  return result;
}

static void export_function(napi_env env, napi_value exports, const char *name, napi_callback callback) {
  napi_value fn;
  napi_create_function(env, name, NAPI_AUTO_LENGTH, callback, NULL, &fn);
  napi_set_named_property(env, exports, name, fn);
}

static napi_value Init(napi_env env, napi_value exports) {
  export_function(env, exports, "createTransparentListener", CreateTransparentListener);
  export_function(env, exports, "setSocketMark", SetSocketMark);
  export_function(env, exports, "connectMarked", ConnectMarked);
  export_function(env, exports, "startTransparentBridge", StartTransparentBridge);
  export_function(env, exports, "startMarkedEgress", StartMarkedEgress);
  export_function(env, exports, "stopRelay", StopRelay);
  export_function(env, exports, "relayStats", RelayStats);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)

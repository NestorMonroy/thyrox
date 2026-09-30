#!/usr/bin/env bash
# Anulaciones del puente y la salida marcada en transparent.c: cada una recompila el .node,
# corre las pruebas del paquete y restaura la fuente y el binario.
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
P="$ROOT/src/packages/transparent-napi"
C="$P/native/transparent.c"
N="$P/vendor/x64-linux/transparent.node"
run() { (cd "$P" && timeout 120 bun test 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'); }
annul() {
  cp "$C" "$C.orig"; cp "$N" "$N.orig"
  OLD="$2" NEW="$3" bash "$ROOT/bin/replace_literal" "$C" >/dev/null || { echo "NO APLICÓ: $1"; mv "$C.orig" "$C"; mv "$N.orig" "$N"; return; }
  (cd "$P" && timeout 120 bun bin/build.ts >/dev/null) || echo "no compiló: $1"
  echo "== anulada: $1"; run
  mv "$C.orig" "$C"; mv "$N.orig" "$N"
}
echo "== base"; run
annul "el puente no escribe la cabecera PROXY" '  if (length > 0 && write_all(upstream, header, (size_t)length)) {' '  if (length > 0) {'
annul "la salida no pone SO_MARK" '    if (setsockopt(upstream, SOL_SOCKET, SO_MARK, &mark, sizeof(mark)) < 0 ||
        getsockopt' '    if (getsockopt'
annul "stopRelay no cierra el socket a la escucha" '  pthread_join(relay->thread, NULL);
  close(relay->listen_fd);' '  pthread_join(relay->thread, NULL);'
annul "la salida acepta una cabecera que no es PROXY" '  int valid = read_proxy_line(conn->client_fd, line, sizeof(line)) &&
              sscanf(line, "PROXY TCP4 %15s %15s %u %u", src_ip, dst_ip, &src_port, &dst_port) == 4 &&
              dst_port > 0 && dst_port <= 65535 && inet_pton(AF_INET, dst_ip, &addr.sin_addr) == 1;' '  int valid = read_proxy_line(conn->client_fd, line, sizeof(line));'
echo "== restaurado"; run
git -C "$ROOT" diff --stat -- "$C" | tail -1
cmp -s "$N" <(git -C "$ROOT" show HEAD:src/packages/transparent-napi/vendor/x64-linux/transparent.node) && echo "binario igual al de HEAD" || echo "binario distinto de HEAD (esperado: se recompiló con el puente)"

#!/usr/bin/env bash
# Línea base de P1: ejecuta comandos de arranque del cli con cada dependencia
# operacional apuntando a un centinela (un listener TCP que cuenta conexiones y
# un binario de Podman que deja rastro) y publica qué se activó.
# Métrica: conexiones aceptadas por el listener y rastros del Podman centinela.
# Ciega a: una dependencia que se abra por socket Unix o por una variable que
# este guion no redirige.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
work=$(mktemp -d); trap 'rm -rf "${work:?}"' EXIT
python3 - "$work" <<'PY' &
import socket, sys, pathlib
out = pathlib.Path(sys.argv[1]) / "connections"
s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("127.0.0.1", 0)); s.listen(64)
(pathlib.Path(sys.argv[1]) / "port").write_text(str(s.getsockname()[1]))
while True:
    c, _ = s.accept()
    with out.open("a") as f: f.write("1\n")
    c.close()
PY
listener=$!
for _ in $(seq 50); do test -s "$work/port" && break; sleep 0.1; done
port=$(cat "$work/port")
printf '#!/bin/sh\necho "$@" >> %s/podman-calls\n' "$work" > "$work/podman"; chmod +x "$work/podman"
run() {
  : > "$work/connections"; rm -f "$work/podman-calls"
  env THYROX_REDIS_URL="redis://127.0.0.1:$port" \
      THYROX_OBSERVABILITY_DATABASE_URL="postgres://u:p@127.0.0.1:$port/x" \
      THYROX_SEMANTIC_SEARCH_DATABASE_URL="postgres://u:p@127.0.0.1:$port/x" \
      THYROX_OPENAI_COMPAT_BASE_URL="http://127.0.0.1:$port/v1" \
      THYROX_TOOLCHAIN_PODMAN_BIN="$work/podman" PATH="$work:$PATH" \
      timeout 60 bash bin/cli "$@" > "$work/out" 2>&1
  rc=$?
  printf '%s\texit=%s\tconexiones=%s\tpodman=%s\tprimera_linea=%s\n' "$*" "$rc" \
    "$(wc -l < "$work/connections")" "$( (wc -l < "$work/podman-calls") 2>/dev/null || echo 0)" \
    "$(head -1 "$work/out" | cut -c1-80)"
}
run --version
run --help
run -p --help
kill "$listener" 2>/dev/null

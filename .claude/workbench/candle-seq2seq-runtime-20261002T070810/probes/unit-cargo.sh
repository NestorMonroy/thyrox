#!/usr/bin/env bash
# unit-cargo.sh <nombre> <líneas de cola> <comando>: corre <comando> en una ExecutionUnit de
# TASK-THYROX-0764 con el toolchain de Rust del anfitrión montado (cargo/rustup) y el CA del proxy.
set -u
name="$1" lines="$2" cmd="$3"
cd /home/user/thyrox
out=$(bash bin/thyrox-bg start "$name" --grace 0 --task TASK-THYROX-0764 --kind test --network host \
  --mount /root/.cargo:/root/.cargo:rw --mount /root/.rustup:/root/.rustup:ro --mount /root/.ccr:/root/.ccr:ro \
  -- bash -c "export CARGO_HOME=/root/.cargo RUSTUP_HOME=/root/.rustup PATH=/root/.cargo/bin:\$PATH CARGO_HTTP_CAINFO=/root/.ccr/ca-bundle.crt SSL_CERT_FILE=/root/.ccr/ca-bundle.crt; cd /home/user/thyrox && $cmd" 2>&1)
run=$(printf '%s\n' "$out" | gawk -F= '/^RUN=/{print $2}')
[[ -n "$run" ]] || { printf '%s\n' "$out"; exit 2; }
timeout 1800 bash bin/thyrox-bg wait "$name" 1790 >/dev/null 2>&1
echo "[$name] $(bash bin/thyrox-bg status "$name")"
tail -n "$lines" "$run/outputs/salida.log"

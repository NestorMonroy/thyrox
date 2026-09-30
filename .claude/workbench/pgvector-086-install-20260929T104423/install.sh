#!/usr/bin/env bash
# Instala pgvector v0.8.6 compilado contra el PostgreSQL de Ubuntu: el paquete de
# desarrollo del servidor (trae clang-17 para el bitcode del JIT) y la etiqueta del
# fuente. El resultado se comprueba por default_version de vector.control.
set -euo pipefail
B="$(cd "$(dirname "$0")" && pwd)"
export DEBIAN_FRONTEND=noninteractive
echo "== antes"; pg_config --version; grep default_version "$(pg_config --sharedir)/extension/vector.control"
apt-get install -y postgresql-server-dev-16
echo "== tras apt"; pg_config --version; pg_lsclusters
src="$(mktemp -d)"
git clone -q --depth 1 --branch v0.8.6 https://github.com/pgvector/pgvector.git "$src/pgvector"
make -C "$src/pgvector" -j"$(nproc)"
make -C "$src/pgvector" install
rm -rf "${src:?}"
echo "== despues"; grep default_version "$(pg_config --sharedir)/extension/vector.control"

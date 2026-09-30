#!/usr/bin/env bash
# Inventario de lo que una instalación de thyrox necesita, derivado del código:
# herramientas del toolchain, contenedores de infraestructura declarados,
# servicios que el árbol arranca y claves de conexión a servicios.
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}" || exit 2
echo "== herramientas que el toolchain sabe exigir (thyrox_toolchain_require_*)"
grep -oE '^function thyrox_toolchain_require_[a-z_]+' src/lib/toolchain.sh | sed 's/^function thyrox_toolchain_require_//' | sort
echo "== contenedores de infraestructura declarados (src/lib/infrastructure.sh)"
grep -oE '^_thyrox_infrastructure_create_argv_[a-z_]+' src/lib/infrastructure.sh | sed 's/^_thyrox_infrastructure_create_argv_//' | sort
echo "== claves de conexión a servicios en .env.example"
grep -oE '^THYROX_[A-Z_]*(DATABASE_URL|_URL|REDIS[A-Z_]*|OLLAMA[A-Z_]*|INFRA_[A-Z_]+|PROXY_MODE|OPENAI_COMPAT_[A-Z_]+)=' .env.example | tr -d '=' | sort -u
echo "== envoltorios de bin/ que arrancan un proceso de larga vida"
ls bin | grep -iE 'daemon|proxy|server|serve|infrastructure' | sort
echo "== pasos de install.sh (funciones)"
grep -oE '^[a-z_]+\(\)' install.sh | tr -d '()' | sort

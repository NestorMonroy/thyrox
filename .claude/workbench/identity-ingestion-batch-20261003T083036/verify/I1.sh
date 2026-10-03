#!/usr/bin/env bash
# Verificación del ítem I1: la prueba de contrato del paquete pasa en el worktree.
set -euo pipefail
cd src/packages/project-identity
bun test

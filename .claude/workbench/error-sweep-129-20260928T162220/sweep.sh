#!/usr/bin/env bash
# Barrido de errores de #129: lint (Python y shell) y typecheck por paquete.
cd /home/user/thyrox
echo "== lint"; bash bin/check_lint_zero 2>&1 | tail -30
echo "== typecheck"; bash bin/check_package_typecheck --no-rebuild 2>&1 | tail -80

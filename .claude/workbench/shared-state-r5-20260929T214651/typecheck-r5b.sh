#!/usr/bin/env bash
# Typecheck de los paquetes que toca R5b; el código de salida del gate no se pierde en la tubería.
set -u -o pipefail
cd /home/user/thyrox
bash bin/check_package_typecheck provider shared-state mitm 2>&1 | tail -25

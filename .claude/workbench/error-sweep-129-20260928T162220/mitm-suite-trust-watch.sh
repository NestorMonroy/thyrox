#!/usr/bin/env bash
# Corre la suite de @thyrox/mitm y dice si dejó una CA en el almacén de confianza del sistema.
cd /home/user/thyrox/src/packages/mitm
before=$(ls /usr/local/share/ca-certificates | sort)
timeout 900 bun test 2>&1 | tail -4
after=$(ls /usr/local/share/ca-certificates | sort)
echo "== nuevo en el almacén del sistema:"; comm -13 <(printf '%s\n' "$before") <(printf '%s\n' "$after")

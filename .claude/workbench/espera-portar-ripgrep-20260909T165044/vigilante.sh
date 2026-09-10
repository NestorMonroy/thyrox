#!/usr/bin/env bash
# Vigilante del centinela `DONE` del agente que porta ripgrep.ts.
#
# Por que un centinela y no un PID: un subagente NO es un proceso — corre en el
# harness, asi que `kill -0` no lo puede sondear. Lo unico observable desde el
# shell es lo que el agente escribe en su banco, y su prompt manda escribir
# `DONE` AL FINAL, cuando el commit ya existe.
#
# Metrica: existencia del archivo `DONE` en el banco del agente.
# Ciega a: la diferencia entre «el agente murio» y «el agente sigue lento» —
#   sin PID no hay sonda de vida. Solo distingue centinela contra agotamiento.
#   La vivacidad a media tarea se lee del transcript, no de aqui.
set -uo pipefail
BANCO="${1:?uso: vigilante.sh <banco>}"
INTENTOS="${2:-540}"     # 540 x 5 s = 45 min
for _ in $(seq 1 "$INTENTOS"); do
    if [ -e "$BANCO/DONE" ]; then
        echo "CENTINELA presente: $BANCO/DONE"
        ls -la "$BANCO"
        echo "EXIT=0"
        exit 0
    fi
    sleep 5
done
echo "AGOTADO sin centinela tras $INTENTOS intentos — el agente sigue vivo o murio; esto no lo distingue."
echo "EXIT=3"
exit 3

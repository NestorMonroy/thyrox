#!/bin/bash
# Traza: qué ve la consulta de --limit (padres, hijos de Parallel).
P1=$PPID; P2="$(ps -o ppid= -p "$P1" | tr -d ' ')"
echo "self=$$ ppid=$P1 ($(ps -o comm= -p $P1)) gpid=$P2 ($(ps -o comm= -p $P2)) children_of_g=$(pgrep -c -P "$P2") children_of_p=$(pgrep -c -P "$P1")" >> "$1"
exit 0

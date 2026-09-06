#!/usr/bin/env bash
# El corredor de las tres suites de THYROX.
#
# Existe porque el producto no es de un solo lenguaje y no tiene por que serlo:
# el criterio es por dominio, no uniforme. Ver README.md.
#
# Publica el conteo de cada mitad. Un corredor que sumara las tres en una cifra
# sola no dejaria ver cual quedo sin correr, que es el defecto que un verde sin
# denominador produce.
#
# Por que descubre y luego invoca, en vez de invocar con una raiz
# ---------------------------------------------------------------
# La version anterior decia `bun test tests/` y terminaba con «las dos mitades
# en verde». Medido: `bun test tests/` corre 10 archivos y `bun test` a secas
# corre 276 — la raiz recortada dejaba fuera todo `src/`. Y la mitad de shell,
# 91 archivos, no tenia invocacion ninguna. Las dos mitades estaban en verde y
# la frase era cierta; la conclusion que induce —«la suite pasa»— era falsa.
#
# Descubrir primero y pasar la lista al corredor de cada lengua hace que
# `--list` y lo que se ejecuta sean el MISMO conjunto por construccion: no hay
# forma de que la lista mienta sobre el alcance sin que la ejecucion cambie
# igual. Ese acoplamiento es el punto — es lo que hace del `--list` un
# instrumento y no una promesa.
set -uo pipefail
cd "$(dirname "$0")/.."

# `node_modules` trae tests de terceros —198 de zod, medidos— que no son
# nuestros: incluirlos inflaria el denominador con material que no mantenemos.
descubrir_ts()     { find src tests -name '*.test.ts' -not -path '*/node_modules/*' | sort; }
descubrir_python() { find tests -name 'test_*.py' -not -path '*/node_modules/*' | sort; }
# `run-all.sh` y este mismo archivo son corredores, no pruebas; no empiezan por
# `test` asi que el patron ya los excluye, y se declara para que se lea.
descubrir_shell()  { find tests -name 'test*.sh' -not -path '*/node_modules/*' | sort; }

only="${1:-}"

if [ "$only" = "--list" ]; then
  { descubrir_ts; descubrir_python; descubrir_shell; }
  exit 0
fi

# Se cuentan LENGUAS en rojo, no suites: la version anterior sumaba una unidad
# por cada suite de Python que fallara y una sola por toda la mitad de TS, asi
# que publico «11 lengua(s) en rojo» habiendo tres. Mezclar unidades en un
# contador es el mismo defecto que este corredor existe para no cometer.
failures=0
declare -a resumen=()

if [ "$only" != "--python-only" ] && [ "$only" != "--shell-only" ]; then
  echo "== TypeScript (bun) =="
  mapfile -t suites_ts < <(descubrir_ts)
  if bun test "${suites_ts[@]}"; then
    resumen+=("TypeScript: ${#suites_ts[@]} archivo(s), en verde")
  else
    failures=$((failures + 1))
    resumen+=("TypeScript: ${#suites_ts[@]} archivo(s), EN ROJO")
  fi
  echo
fi

if [ "$only" != "--ts-only" ] && [ "$only" != "--shell-only" ]; then
  echo "== Python (stdlib) =="
  count=0
  rojos_py=0
  while IFS= read -r suite; do
    count=$((count + 1))
    echo "-- $suite"
    python3 "$suite" || rojos_py=$((rojos_py + 1))
  done < <(descubrir_python)
  [ "$rojos_py" -gt 0 ] && failures=$((failures + 1))
  resumen+=("Python: $count suite(s), $rojos_py en rojo")
  echo "  ($count suite(s) de Python, $rojos_py en rojo)"
  echo
fi

if [ "$only" != "--ts-only" ] && [ "$only" != "--python-only" ]; then
  echo "== shell (bash) =="
  count=0
  rojos_sh=0
  while IFS= read -r suite; do
    count=$((count + 1))
    if bash "$suite" >/dev/null 2>&1; then
      :
    else
      rojos_sh=$((rojos_sh + 1))
      echo "-- ROJO $suite"
    fi
  done < <(descubrir_shell)
  [ "$rojos_sh" -gt 0 ] && failures=$((failures + 1))
  resumen+=("shell: $count suite(s), $rojos_sh en rojo")
  echo "  ($count suite(s) de shell, $rojos_sh en rojo)"
fi

echo
echo "== alcance =="
for linea in "${resumen[@]}"; do echo "  $linea"; done

if [ "$failures" -gt 0 ]; then
  echo
  echo "FALLA: $failures lengua(s) en rojo"
  exit 1
fi
echo
echo "OK: las tres lenguas en verde"

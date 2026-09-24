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

# El checkout que contiene este runner es el sujeto. Una variable o un `.env`
# heredado no puede redirigir la medición hacia otro clon.
export THYROX_ROOT="$PWD"
export THYROX_REACH_ROOT="$(dirname "$PWD")"

# El lock de Python sólo gobierna si se usa su intérprete. Los fixtures
# sintéticos del runner no tienen `.venv`, por eso conservan un fallback.
PYTHON_BIN="$PWD/.venv/bin/python"
[ -x "$PYTHON_BIN" ] || PYTHON_BIN="$(command -v python3)"

# --- La raiz la declara el CORREDOR, no cada modulo ---------------------------
#
# `bin/` ya lo hacia (`export PYTHONPATH="$THYROX_ROOT/src"`) y este corredor no,
# asi que cada suite tenia que abrirse el camino sola con un
# `sys.path.insert(0, ... parents[N] / "src")`. Esa aritmetica es la que
# `check_path_arithmetic.py` exime «cuando alimenta un sys.path.insert» — una
# exencion que solo se sostenia mientras nadie declarara la raiz.
#
# Con la raiz declarada aqui, el insert deja de ser necesario y pasa a ser
# deuda. NO se barren los 123 de `src/` en este pase: se paga al tocar, que es
# el criterio prospectivo del arbol. Precondicion de TASK-THYROX-0018.
export PYTHONPATH="$PWD/src${PYTHONPATH:+:$PYTHONPATH}"

# --- El grifo de /tmp: un TMPDIR por ejecucion, retirado al salir -------------
#
# Medido antes de escribir esto: 105 715 directorios de fixture en /tmp, dejados
# por nuestras propias suites — 115 archivos `.ts` crean con `mkdtemp` y 56 no
# retiran nunca. La correccion NO edita esos 56: redirige `TMPDIR`, que
# `os.tmpdir()` de bun, `mkdtempSync` de `node:fs` y `mktemp -d` de coreutils
# honran los tres (medido por conducta, no leido de una descripcion). El bypass
# esta medido en CERO: ningun `.ts`, `.py` ni `.sh` del arbol crea bajo un
# literal `/tmp/`.
#
# `THYROX_TEST_TMPDIR` declara que el directorio es de esta ejecucion. El preload
# de `bunfig.toml` lo hereda y NO lo retira — sin esa guarda, cada `bun test`
# borraria el directorio de los demas mientras corren.
#
# El trap retira SOLO lo que este guion creo, y re-comprueba el prefijo antes de
# borrar: la variable la puede fijar cualquiera, el nombre del directorio no.
THYROX_TEST_TMPDIR="$(mktemp -d "${TMPDIR:-/tmp}/thyrox-tests-XXXXXX")"
export THYROX_TEST_TMPDIR
export TMPDIR="$THYROX_TEST_TMPDIR"
retirar_tmpdir() {
  case "$THYROX_TEST_TMPDIR" in
    */thyrox-tests-*) rm -rf "$THYROX_TEST_TMPDIR" ;;
  esac
}
trap retirar_tmpdir EXIT

# `node_modules` trae tests de terceros —198 de zod, medidos— que no son
# nuestros: incluirlos inflaria el denominador con material que no mantenemos.
descubrir_ts()     { find src tests \( -name '*.test.ts' -o -name '*.test.tsx' \) -not -path '*/node_modules/*' | sort; }
descubrir_python() { find tests -name 'test_*.py' -not -path '*/node_modules/*' | sort; }
# `run-all.sh` y este mismo archivo son corredores, no pruebas; no empiezan por
# `test` asi que el patron ya los excluye, y se declara para que se lea.
descubrir_shell()  { find tests -name 'test*.sh' -not -path '*/node_modules/*' | sort; }

only="${1:-}"

# --- `--changed`: el subconjunto DERIVADO, no la suite entera ---------------
#
# `test-execution-protocol.md` manda correr «el modulo tocado mas sus
# consumidores medidos» y NO la pila entera. Hasta hoy esa regla era prosa sin
# comando: derivar el subconjunto costaba dos greps a mano, asi que lo barato
# era lanzar todo.
#
# Medido el 2026-09-06 sobre un cambio de tres archivos: la suite completa
# tardo 110 s y el subconjunto derivado 0.359 s —308x— y NINGUNO de los 97
# rojos que publico venia del cambio. Ver :ref:`h-docs-1130`.
#
# Que deriva: los archivos que el arbol tiene tocados (sin publicar o sin
# commitear) y, por cada uno, las suites que MENCIONAN su nombre de modulo.
# Ciega a: un consumidor que llegue por herencia sin nombrar el simbolo — por
# eso NO sustituye a la suite entera al cerrar un bloque, solo entre commits.
if [ "$only" = "--changed" ] || [ "$only" = "--changed-list" ]; then
  tocados="$( { git diff --name-only HEAD 2>/dev/null
                git status --porcelain --untracked-files=all 2>/dev/null | cut -c4-
              } | grep -E '\.(py|ts|sh)$' | sort -u )"
  if [ -z "$tocados" ]; then
    echo "run.sh --changed: el arbol no tiene archivos tocados. Nada que derivar."
    exit 0
  fi
  # COMO se empareja, y por que no por el stem pelado. La primera version uso
  # el stem sin extension y `tests/run.sh` derivo `run`, que como SUBCADENA
  # casa con 150+ suites de 158 — una derivacion que no deriva nada y cuya
  # salida parece un resultado. Se empareja por como un consumidor NOMBRA el
  # archivo: la ruta, el basename con extension, o el import del modulo.
  patron="$(printf '%s\n' "$tocados" | while read -r f; do
              base="${f##*/}"; stem="${base%.*}"
              printf '%s\n%s\n' "$(printf '%s' "$f" | sed 's|[./]|[./]|g')" "$base"
              case "$f" in
                *.py) printf 'import %s\n%s\.%s\n' "$stem" "[a-z_]*" "$stem" ;;
              esac
            done | grep -v '^$' | sort -u | paste -sd'|')"
  derivadas="$( { descubrir_ts; descubrir_python; descubrir_shell; } \
                | while read -r s; do
                    grep -qE "$patron" "$s" 2>/dev/null && echo "$s"
                  done )"
  # Un archivo tocado que ES una suite entra aunque nadie lo mencione.
  derivadas="$(printf '%s\n%s\n' "$derivadas" \
                 "$(printf '%s\n' "$tocados" | grep -E '^tests/.*(test_.*\.py|test.*\.sh)$|\.test\.ts$')" \
               | grep -v '^$' | sort -u)"
  if [ "$only" = "--changed-list" ]; then
    printf '%s\n' "$derivadas"
    exit 0
  fi
  if [ -z "$derivadas" ]; then
    echo "run.sh --changed: $(printf '%s\n' "$tocados" | wc -l) archivo(s) tocado(s)," \
         "0 suites que los mencionen."
    echo "NO se emite verde: cero suites derivadas no es «pasa», es «no medi nada»."
    exit 2
  fi
  total_suites="$( { descubrir_ts; descubrir_python; descubrir_shell; } | wc -l )"
  n_der="$(printf '%s\n' "$derivadas" | wc -l)"
  if [ "$n_der" -gt $(( total_suites / 2 )) ]; then
    echo "run.sh --changed: la derivacion trajo $n_der de $total_suites suites."
    echo "Eso NO es un subconjunto: el patron no discrimino. No se corre nada —"
    echo "un verde sobre media suite se leeria como «el cambio esta cubierto»."
    exit 2
  fi
  echo "== subconjunto derivado: $(printf '%s\n' "$derivadas" | wc -l) suite(s) de" \
       "$(printf '%s\n' "$tocados" | wc -l) archivo(s) tocado(s) =="
  rojas=0
  while read -r s; do
    [ -n "$s" ] || continue
    case "$s" in
      *.test.ts) bun test "$s" >/dev/null 2>&1 ;;
      *.py)      "$PYTHON_BIN" "$s" >/dev/null 2>&1 ;;
      *)         bash "$s" >/dev/null 2>&1 ;;
    esac
    if [ $? -eq 0 ]; then echo "-- $s"; else echo "-- ROJO $s"; rojas=$((rojas+1)); fi
  done <<< "$derivadas"
  echo "== $rojas en rojo de $(printf '%s\n' "$derivadas" | wc -l) derivadas =="
  [ "$rojas" -eq 0 ] || exit 1
  exit 0
fi

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
  # Un proceso de `bun test` por archivo (src/verify/run_ts_isolated.sh):
  # `mock.module` es global al proceso y, con todos los archivos en uno, un
  # archivo contaminaba a los siguientes hasta tumbar a Bun.
  if printf '%s\n' "${suites_ts[@]}" | bash src/verify/run_ts_isolated.sh; then
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
  sin_medir_py=0
  # Exit 2 NO es rojo, aqui tampoco: es «rehuso, no emito veredicto». La mitad
  # de shell lo separa desde su primera version y esta lo colapsaba con el 1
  # (`python3 "$suite" || ROJO`), asi que el corredor publicaba «la suite fallo»
  # donde lo cierto era «no habia con que medir» — y ese rojo entraba al conteo
  # que decide si la ejecucion entera falla. Las dos mitades miden el mismo
  # contrato; que una lo honre y la otra no es el sub-patron D con el corredor
  # como instrumento. Se cuentan aparte y NO suman a `failures`.
  while IFS= read -r suite; do
    count=$((count + 1))
    # La mitad shell marca `-- ROJO <suite>` y esta sólo publicaba el conteo:
    # once rojos sin nombre no se pueden triar. Misma forma que «un conteo sin
    # denominador no es un resultado», un nivel más abajo.
    echo "-- $suite"          # ANTES de correr: un cuelgue se atribuye
    "$PYTHON_BIN" "$suite"
    case $? in
      0) ;;
      2) sin_medir_py=$((sin_medir_py + 1)); echo "-- SIN MEDIR (exit 2) $suite" ;;
      *) rojos_py=$((rojos_py + 1));         echo "-- ROJO $suite" ;;
    esac
  done < <(descubrir_python)
  [ "$rojos_py" -gt 0 ] && failures=$((failures + 1))
  resumen+=("Python: $count suite(s), $rojos_py en rojo, $sin_medir_py sin medir")
  echo "  ($count suite(s) de Python, $rojos_py en rojo, $sin_medir_py sin medir)"
  echo
fi

if [ "$only" != "--ts-only" ] && [ "$only" != "--python-only" ]; then
  echo "== shell (bash) =="
  count=0
  rojos_sh=0
  sin_medir=0
  # Exit 2 NO es rojo: es «rehuso, no emito veredicto» — el contrato que
  # `check_script_naming.py` y `tests/verify/test-pre-commit-docs.sh` usan
  # cuando falta su sujeto (el lexico, el clon hermano de kaupamex-docs).
  # Colapsarlo con el 1 hace que el corredor publique «la suite fallo» donde
  # lo cierto es «no habia con que medir», que es el sub-patron D aplicado a
  # este mismo archivo. Se cuentan aparte y NO suman a `failures`.
  while IFS= read -r suite; do
    count=$((count + 1))
    bash "$suite" >/dev/null 2>&1
    case $? in
      0) ;;
      2) sin_medir=$((sin_medir + 1)); echo "-- SIN MEDIR (exit 2) $suite" ;;
      *) rojos_sh=$((rojos_sh + 1));   echo "-- ROJO $suite" ;;
    esac
  done < <(descubrir_shell)
  [ "$rojos_sh" -gt 0 ] && failures=$((failures + 1))
  resumen+=("shell: $count suite(s), $rojos_sh en rojo, $sin_medir sin medir")
  echo "  ($count suite(s) de shell, $rojos_sh en rojo, $sin_medir sin medir)"
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

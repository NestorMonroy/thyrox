#!/usr/bin/env bash
# check-toolchain-ready.sh — preflight en seco de la cadena de herramientas.
#
# Que verifica, y por que no es «esta instalado»
# -----------------------------------------------
# Cada gate de este arbol se apoya en una herramienta externa, y el veredicto
# que publica DEPENDE de cual responde. El episodio que lo fija esta medido:
# `check-hallazgo-sucesor.sh` publicaba «6 incumplidores sobre 377 archivos»
# cuando la medicion real era «13 sobre 1002», porque una de sus ocho
# alternativas no compilaba bajo el awk que resolvia (h-docs-1068). La cifra
# era sana; el universo, un tercio. Un gate sin su herramienta no falla
# ruidosamente: publica otra cosa.
#
# Por eso las sondas miden CONDUCTA y no presencia. `command -v gawk` dice si
# el paquete esta; no dice que `awk` resuelva a el —en Debian lo decide
# `/etc/alternatives/awk`— ni que ESE binario compile el constructo. Medir el
# significante y concluir sobre el significado es el sub-patron C de
# `metrica-decide-la-conclusion.md`.
#
# Procedencia del porte — leida en solo lectura
# ----------------------------------------------
#   tencentdb-agent-memory: deploy/global-images/verify.sh + _lib.sh (MIT)
#     De ahi, TRES rasgos:
#       1. recoger TODOS los fallos y publicarlos juntos, no rehusar al
#          primero. `_lib.sh::require_vars` lo declara verbatim: «缺一个都不
#          启动，一次性列出所有缺失项». Su razon esta escrita en
#          `start-all.sh`: validar todo por adelantado evita descubrir que
#          falta un parametro del tercer componente con el primero ya en pie.
#       2. separar error de aviso y contarlos aparte (`verify.sh`:
#          ERRORS / WARNS), porque no todo hueco cambia un veredicto.
#       3. no arrancar nada: «不启动任何容器，只检查环境是否就绪».
#
#     NO se porta, y cada omision tiene sujeto ausente, no pereza: contenedores,
#     puertos, imagenes y volumenes —este arbol no tiene ninguno—; el relleno
#     interactivo de credenciales, que imprime el valor vigente como default y
#     aqui los valores del entorno no se leen; y `set_env_value`, que
#     `install.sh::write_declaration` ya resuelve.
#
#   DIVERGENCIA declarada: la referencia colapsa su veredicto en 0/1 —«errores
#   → 1, avisos → 0, todo bien → 0»—, asi que un preflight que no PUDO medir
#   publicaria «1 error», que es otra afirmacion. Aqui eso es exit 2 y sin
#   conteo, la forma que este arbol ya ejerce en `check_vocabulario_prosa` y
#   en `census_findings`.
#
# Un efecto que NO es de solo lectura, y se declara en vez de ocultarse
# ---------------------------------------------------------------------
# La sonda de `parallel` escribe `$PARALLEL_HOME/will-cite` cuando falta:
# GNU parallel BLOQUEA su primera invocacion esperando el reconocimiento de la
# cita, y un guion no interactivo no puede conducir ese prompt. Es idempotente
# y es exactamente lo que `--citation` escribe al aceptarse. Se nombra aqui
# porque un «no cambia nada» con una excepcion callada es peor que una
# excepcion declarada.
#
# Uso
#   bash src/verify/check-toolchain-ready.sh            reporte
#   bash src/verify/check-toolchain-ready.sh --strict   exit 1 tambien por aviso
#
# Variables
#   THYROX_LIB_TOOLCHAIN          ruta a la biblioteca de la cadena. Sin ella,
#                                 se deriva del directorio de este guion.
#   THYROX_TOOLCHAIN_AWK_BIN      el awk que la sonda interroga.
#   THYROX_TOOLCHAIN_PARALLEL_BIN el parallel que la sonda interroga.
#
# @exitcode 0 Todas las sondas pasan, o solo hay avisos.
# @exitcode 1 Al menos una sonda de clase `error` fallo (o `--strict` con aviso).
# @exitcode 2 NO SE PUDO MEDIR: la biblioteca de la cadena no esta alcanzable.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

STRICT=0
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=1 ;;
    --help|-h) sed -n '2,70p' "$0"; exit 0 ;;
    *) echo "check-toolchain-ready: argumento no reconocido: $arg" >&2; exit 2 ;;
  esac
done

# --------------------------------------------------------------------------
# Precondicion. Si la biblioteca no esta, no hay nada que medir: se rehusa con
# exit 2 y SIN conteo. Un 0 aqui no distinguiria «la cadena esta sana» de «no
# la pude interrogar».
# --------------------------------------------------------------------------
# El VALOR de la clave es relativo a la raiz, como el de `THYROX_LIB_REACH` en
# sus cuatro consumidores: `source "$_thyrox_root/${THYROX_LIB_REACH:-...}"`.
# Aqui se admiten las dos formas —absoluta y relativa— porque el control de la
# precondicion necesita apuntar a una ruta que no exista, y una absoluta es la
# unica que no depende del cwd. Consumir el valor tal cual resolveria la forma
# relativa contra el cwd, que bajo el corredor es un CONSUMIDOR: el gate saldria
# 2 sobre un arbol sano.
LIB="${THYROX_LIB_TOOLCHAIN:-src/lib/toolchain.sh}"
case "$LIB" in
  /*) : ;;
  *)  LIB="$ROOT/$LIB" ;;
esac
if [[ ! -r "$LIB" ]]; then
  echo "check-toolchain-ready: no alcanza la biblioteca de la cadena en $LIB." >&2
  echo "                       Declara THYROX_LIB_TOOLCHAIN o corre este guion" >&2
  echo "                       desde su sitio en el arbol del proveedor." >&2
  echo "                       NO se emite conteo: un cero aqui seria un verde" >&2
  echo "                       falso." >&2
  exit 2
fi
# shellcheck source=/dev/null
if ! source "$LIB" 2>/dev/null; then
  echo "check-toolchain-ready: $LIB existe y no se pudo cargar." >&2
  echo "                       NO se emite conteo." >&2
  exit 2
fi

# --------------------------------------------------------------------------
# El registro de sondas, como LISTA ORDENADA: `nombre|clase|funcion`.
#
# La CLASE no es severidad estetica: separa «sin esto un gate publica otro
# veredicto» (error) de «sin esto algo va mas lento» (aviso). Es el eje que la
# referencia ya trae y que un preflight binario pierde.
#
# El denominador NO se escribe a mano: sale de contar este registro. Una sonda
# nueva sin su entrada aparece como «N de M» con M corrido, que es lo que
# `thyrox-audit.sh` ya ejerce con sus `tick`.
# --------------------------------------------------------------------------
PROBES=(
  "awk|error|thyrox_toolchain_require_gawk"
  "parallel|aviso|thyrox_toolchain_require_parallel"
  "python-proveedor|error|thyrox_toolchain_provider_python"
  "proxy|aviso|thyrox_toolchain_probe_proxy"
)

ERRORS=0; WARNS=0; PASSED=0

for entry in "${PROBES[@]}"; do
  IFS='|' read -r name kind fn <<<"$entry"

  if ! type "$fn" &>/dev/null; then
    echo "error · $name — la biblioteca no define $fn" >&2
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # La salida de la sonda se captura y se RELEVA tal cual. Componer un remedio
  # propio duplicaria el que la sonda ya escribe, y dos redacciones del mismo
  # remedio divergen: es la segunda fuente de verdad que este arbol prohibe
  # para una cifra, y vale igual para una instruccion.
  probe_out="$("$fn" 2>&1 >/dev/null)"; rc=$?

  if [[ $rc -eq 0 ]]; then
    echo "ok · $name"
    PASSED=$((PASSED + 1))
    continue
  fi

  # Se sigue con la siguiente sonda: el veredicto se compone al final con
  # TODOS los huecos, no con el primero.
  if [[ "$kind" == "error" ]]; then
    echo "error · $name"
    ERRORS=$((ERRORS + 1))
  else
    echo "aviso · $name"
    WARNS=$((WARNS + 1))
  fi
  [[ -n "$probe_out" ]] && printf '%s\n' "$probe_out" | sed 's/^/        /'
done

TOTAL=${#PROBES[@]}
MEASURED=$((PASSED + ERRORS + WARNS))
echo
echo "$PASSED ok · $ERRORS error · $WARNS aviso — alcance medido: $MEASURED de $TOTAL sondas"

if (( ERRORS > 0 )); then
  exit 1
fi
if (( WARNS > 0 && STRICT == 1 )); then
  echo "--strict: un aviso basta para rehusar." >&2
  exit 1
fi
exit 0

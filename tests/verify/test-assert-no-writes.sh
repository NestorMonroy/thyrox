#!/usr/bin/env bash
# Suite de ``assert_no_writes.sh`` — el instrumento que responde «¿este comando
# escribe?» POR CONDUCTA.
#
# Lo que esta suite tiene que discriminar NO es «avisa sobre un escritor»: eso
# pasaria igual con un instrumento que devolviera siempre 1. Los tres ejes que
# la hacen un control y no un adorno:
#
#   1. el NEGATIVO — un comando que no escribe sale 0. Sin el, el instrumento
#      podria estar marcando todo;
#   2. el POSITIVO REAL — un escritor del repo, no uno fabricado a mano. La
#      diferencia importa porque quien escribe el patron no puede validarlo con
#      su propio encuadre (``hallazgo-abierto-genera-sucesor.md``);
#   3. el DOBLE EJE — un detector que muere al importar no escribe nada y
#      pasaria un control que sólo mirara escrituras. Por eso cada caso de
#      detector afirma ``subject_exit=0`` ademas del veredicto de escritura.
#      Colapsarlos seria el sub-patron D con esta misma suite como instrumento.
#
# Uso:  bash tests/verify/test-assert-no-writes.sh
set -uo pipefail
cd "$(dirname "$0")/../.."

SUJETO="src/verify/assert_no_writes.sh"
fallos=0

afirmar() {
  if [ "$1" = "ok" ]; then printf '  ok   %s\n' "$2"
  else printf '  FALLA %s\n' "$2"; fallos=$((fallos + 1)); fi
}
veredicto() { [ "$1" = "$2" ] && echo ok || echo no; }

[ -f "$SUJETO" ] || { echo "ERROR — no existe $SUJETO" >&2
  echo 'NO se emite conteo: sin sujeto no hay prueba.' >&2; exit 2; }
command -v strace >/dev/null 2>&1 || { echo 'ERROR — strace no esta instalado' >&2
  echo 'NO se emite conteo: un verde aqui no distinguiria «no escribe» de «no medi».' >&2
  exit 2; }

T="$(mktemp -d "${TMPDIR:-/tmp}/test-anw-XXXXXX")"
trap 'rm -rf "$T"' EXIT
# Los runs de la familia `jobs` —bg.sh crea su run-puntero aun con `--dir`— van
# al temporal: sin esto la suite dejaba un `sonda-*` en el árbol en cada corrida.
export THYROX_JOBS_DIR="$T/jobs"

echo '1. rehusa en vez de publicar un cero'
bash "$SUJETO" >/dev/null 2>&1
afirmar "$(veredicto $? 2)" 'sin comando que medir sale 2'
bash "$SUJETO" --allow >/dev/null 2>&1
afirmar "$(veredicto $? 2)" '--allow sin su ruta sale 2'

echo '2. el negativo — un comando que no escribe'
salida="$(bash "$SUJETO" -- /bin/true 2>&1)"; codigo=$?
afirmar "$(veredicto $codigo 0)" '/bin/true sale 0'
case "$salida" in *'0 escrituras'*) afirmar ok 'lo declara: 0 escrituras' ;;
  *) afirmar no "lo declara: 0 escrituras (dijo: $salida)" ;; esac
case "$salida" in *'alcance medido'*) afirmar ok 'publica su denominador' ;;
  *) afirmar no 'publica su denominador' ;; esac
case "$salida" in *'subject_exit=0'*) afirmar ok 'publica el exit del sujeto aparte' ;;
  *) afirmar no 'publica el exit del sujeto aparte' ;; esac

echo '3. el positivo REAL — un escritor del repo, no uno fabricado'
# `bg.sh start` escribe su log y su pid: es el escritor mas cercano al trabajo
# de esta sesion, y se le da `--dir` para que aterrice en el temporal del caso
# y no en `.claude/jobs/`. El sujeto de la prueba es un escritor de verdad; lo
# unico que se fabrica es su DESTINO, que es lo que aisla el eje.
salida="$(bash "$SUJETO" -- bash bin/thyrox-bg start sonda --dir "$T/bg" --grace 0 -- /bin/true 2>&1)"
codigo=$?
afirmar "$(veredicto $codigo 1)" 'el escritor real sale 1'
case "$salida" in *"$T/bg"*) afirmar ok 'nombra la ruta que escribio' ;;
  *) afirmar no "nombra la ruta que escribio (dijo: $(printf '%s' "$salida" | head -3))" ;; esac

echo '4. un intento FALLIDO cuenta — la pregunta es la intencion'
bash "$SUJETO" -- /bin/sh -c "echo x > $T/no/existe/f" >/dev/null 2>&1
afirmar "$(veredicto $? 1)" 'abrir para escribir en un directorio inexistente sale 1'

echo '5. los canales del nucleo no son escritura'
bash "$SUJETO" -- /bin/sh -c 'echo x > /dev/null' >/dev/null 2>&1
afirmar "$(veredicto $? 0)" '/dev/null no cuenta'

echo '6. --allow exime la ruta declarada, y solo esa'
bash "$SUJETO" --allow "$T/permitido" -- /bin/sh -c "echo x > $T/permitido" >/dev/null 2>&1
afirmar "$(veredicto $? 0)" 'la ruta permitida no cuenta'
bash "$SUJETO" --allow "$T/permitido" -- /bin/sh -c "echo x > $T/otro" >/dev/null 2>&1
afirmar "$(veredicto $? 1)" 'otra ruta sigue contando'

echo '7. los 11 detectores de PreToolUse no escriben al despachar'
# Cada payload dispara una familia distinta: uno solo dejaria a la mayoria de
# los detectores en su retorno temprano, que no ejercita nada. El despachador
# invoca a los ONCE en cada llamada, asi que lo que se mide es el camino
# completo de carga + `detect()` de todos.
payloads=(
  '{"tool_name":"Bash","tool_input":{"command":"grep -r foo /home/user/odoo-tools"}}'
  '{"tool_name":"Write","tool_input":{"file_path":"source/gestion/pm/api/iniciativas/x/hallazgos/hallazgo-H-DOCS-1-y.rst","content":"texto\n"}}'
  '{"tool_name":"Write","tool_input":{"file_path":"src/foo.py","content":"def procesar_datos():\n    pass\n"}}'
  '{"tool_name":"Agent","tool_input":{"description":"correr la suite","prompt":"corre bash tests/run.sh y dime el conteo"}}'
  '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"cierra board #42\""}}'
)
i=0
for p in "${payloads[@]}"; do
  i=$((i + 1))
  printf '%s' "$p" > "$T/payload.$i.json"
  salida="$(bash "$SUJETO" -- /bin/sh -c \
      "python3 src/hooks/pretooluse_dispatch.py < $T/payload.$i.json" 2>&1)"
  codigo=$?
  afirmar "$(veredicto $codigo 0)" "payload $i: el despacho de los 11 no escribe"
  case "$salida" in *'subject_exit=0'*) afirmar ok "payload $i: el despacho salio 0" ;;
    *) afirmar no "payload $i: el despacho salio 0 ($(printf '%s' "$salida" | head -1))" ;; esac
done

echo
if [ "$fallos" -gt 0 ]; then
  printf 'FALLA: %d asercion(es)\n' "$fallos"; exit 1
fi
printf 'OK: todas las aserciones pasan (alcance medido: %d payload(s) de despacho, 11 detector(es) por payload)\n' \
  "${#payloads[@]}"

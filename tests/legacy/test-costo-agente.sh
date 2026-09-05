#!/usr/bin/env bash
# Pruebas de costo-agente.sh (H-DOCS-170, H-DOCS-240).
#
# POR QUE HAY FIXTURES Y NO SOLO TRANSCRIPTS REALES. La primera version medía
# la aritmetica contra cuatro transcripts reales del contenedor, por su ruta
# fija. Cuando el contenedor se reciclo los cuatro desaparecieron y la suite
# siguio publicando su verde — con CERO cobertura de equiv_cost, factor,
# titular_harness y resets_de_cache, que es todo lo que el guion hace. Un verde
# que no distingue "la aritmetica es correcta" de "no la pude medir" es el
# sub-patron D de `metrica-decide-la-conclusion.md`.
#
# LOS FIXTURES SE CONSTRUYEN INLINE bajo un `mktemp -d` y se alcanzan por el
# canal que el guion ya tenia: la variable `CLAUDE_HOME`. La prueba NO escribe
# ni lee nada del arbol real de transcripts.
#
# LOS VALORES ESPERADOS ESTAN CALCULADOS A MANO desde los pesos declarados en
# H-DOCS-135/136 (in 1x, cc 1.25x, cr 0.1x, out 5x), no copiados de una
# ejecucion del guion: copiarlos haria que el test confirmara al guion en vez
# de medirlo.
#
# EL SKIP ES RUIDOSO. Los transcripts reales de H-DOCS-169/171 se ejercitan si
# siguen en disco, y el resumen publica cuantos casos se saltaron. Un verde con
# skips no se puede leer como cobertura.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

SCRIPT=.claude/scripts/agents/costo-agente.sh
OK=0; FALLO=0; OMITIDOS=0

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FIXTURES="$TMP/projects/-prueba/sesion/subagents"
mkdir -p "$FIXTURES"

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}
omitir() { printf '  SKIP  %s\n' "$1"; (( OMITIDOS++ )); }

# Una linea de transcript: $1 message.id · $2 input · $3 cache_creation
# $4 cache_read · $5 output
turno() {
    printf '{"type":"assistant","message":{"role":"assistant","id":"%s","model":"claude-sonnet-5","usage":{"input_tokens":%d,"cache_creation_input_tokens":%d,"cache_read_input_tokens":%d,"output_tokens":%d}}}\n' \
        "$1" "$2" "$3" "$4" "$5"
}

# Corre el guion contra el arbol de fixtures y devuelve el valor del campo $2.
# $1 = agent_id ; $2 = etiqueta del campo tal cual la imprime el guion.
campo() {
    CLAUDE_HOME="$TMP" bash "$SCRIPT" "$1" 2>&1 \
        | sed -n "s/^$2: *\([^ ]*\).*/\1/p" | head -1
}

echo "== 1. sintaxis =="
bash -n "$SCRIPT"; afirmar "costo-agente.sh parsea" 0 $?

echo "== 2. agent_id inexistente: error claro, exit 1 =="
salida=$(bash "$SCRIPT" no-existe-abc123 2>&1); ec=$?
afirmar "exit 1 sin transcript" "1" "$ec"
echo "$salida" | grep -q "No se encontró transcript" \
    && afirmar "mensaje de error nombra la causa" "si" "si" \
    || afirmar "mensaje de error nombra la causa" "si" "no"

echo "== 3. sin argumentos: uso + exit 2 =="
bash "$SCRIPT" >/dev/null 2>&1; afirmar "exit 2 sin args" "2" "$?"

echo "== 4. aritmetica de equiv_cost — el calculo a mano =="
# in 1500 · cc 2000 · cr 30000 · out 1000
#   equiv = 1500 + 2000*1.25 + 30000*0.1 + 1000*5
#         = 1500 +      2500 +      3000 +   5000 = 12000
#   titular = in + cc + out = 4500   ·   factor = 12000/4500 = 2.67x
# Falla si: cambia cualquiera de los cuatro pesos, o si el titular empieza a
# incluir el cache_read — que es exactamente el defecto que H-DOCS-169 midio.
{ turno m1 1000 2000 10000 400
  turno m2  500    0 20000 600; } > "$FIXTURES/agent-afixtura00000001.jsonl"
afirmar "turnos"           "2"      "$(campo afixtura00000001 'turnos')"
afirmar "input"            "1,500"  "$(campo afixtura00000001 'input')"
afirmar "cache_creation"   "2,000"  "$(campo afixtura00000001 'cache_creation')"
afirmar "cache_read"       "30,000" "$(campo afixtura00000001 'cache_read')"
afirmar "output"           "1,000"  "$(campo afixtura00000001 'output')"
afirmar "titular_harness excluye el cache_read" "4,500" "$(campo afixtura00000001 'titular_harness')"
afirmar "equiv_cost pondera los cuatro"         "12,000" "$(campo afixtura00000001 'equiv_cost')"
afirmar "factor = equiv/titular"                "2.67x"  "$(campo afixtura00000001 'factor')"

echo "== 5. CONTROL — el dedup por message.id =="
# Un turno con N tool-calls emite N lineas con el MISMO message.id. Sin dedup
# el conteo se infla ~2x (H-DOCS-135/136). Aqui m1 aparece dos veces:
#   con dedup:  turnos 2 · in 1500 · out 150 · equiv 1500 + 750 = 2,250
#   sin dedup:  turnos 3 · in 2500 · out 250 · equiv 2500 + 1250 = 3,750
# Falla si el dedup desaparece — y las dos cifras son distinguibles, que es
# lo que hace al caso un control y no un adorno.
{ turno m1 1000 0 0 100
  turno m1 1000 0 0 100
  turno m2  500 0 0  50; } > "$FIXTURES/agent-afixtura00000002.jsonl"
afirmar "el turno repetido no se cuenta dos veces" "2"     "$(campo afixtura00000002 'turnos')"
afirmar "el uso repetido no se suma dos veces"     "1,500" "$(campo afixtura00000002 'input')"
afirmar "equiv_cost con dedup"                     "2,250" "$(campo afixtura00000002 'equiv_cost')"

echo "== 6. reset de cache detectado (H-DOCS-171) =="
# cache_read 40000 -> 5000: viene de >10000 y cae por debajo del 50%.
# Falla si el umbral se relaja o si la deteccion se pierde en un refactor.
{ turno m1 100 0 40000 50
  turno m2 100 0  5000 50; } > "$FIXTURES/agent-afixtura00000003.jsonl"
afirmar "resets_de_cache: 1 en el turno 2" "1" \
    "$(CLAUDE_HOME="$TMP" bash "$SCRIPT" afixtura00000003 2>&1 \
        | grep -c 'resets_de_cache:  1  (turno(s) 2)')"

echo "== 7. CONTROL — las dos guardas que NO deben disparar =="
# Dos caidas que no son reset, cada una por una guarda distinta:
#   8000 -> 100    : la caida es del 99% pero el previo NO supera 10000
#   25000 -> 24000 : el previo si supera 10000 pero la caida es del 4%
# Falla si alguna guarda se retira: el guion empezaria a reportar resets
# fantasma y la cifra dejaria de significar lo que H-DOCS-171 midio.
{ turno m1 50 0  8000 10
  turno m2 50 0   100 10
  turno m3 50 0 25000 10
  turno m4 50 0 24000 10; } > "$FIXTURES/agent-afixtura00000004.jsonl"
afirmar "sin reset: ni el piso ni el umbral disparan" "1" \
    "$(CLAUDE_HOME="$TMP" bash "$SCRIPT" afixtura00000004 2>&1 \
        | grep -c 'resets_de_cache:  0')"

echo "== 8. control positivo REAL — transcripts VERSIONADOS (#657, H-DOCS-242) =="
# Hasta hoy esta seccion apuntaba a /root/.claude/projects/<sesion>/subagents,
# ruta de un contenedor que ya no existe: los seis casos se omitian y la suite
# publicaba verde sin medir nada de lo que el guion hace. Los fixtures de aqui
# son transcripts REALES anonimizados con `anonymize_transcript.py` y
# versionados en el repo, asi que la cobertura ya no depende del contenedor.
#
# LOS ESPERADOS SE CALCULARON APARTE, con un lector propio (json + los pesos de
# H-DOCS-135/136), no copiando la salida del guion. El primer calculo divergio
# en 5285 y la causa fue el DEDUP: un mensaje se re-emite mientras se genera, y
# su contabilidad completa es la ULTIMA aparicion de su `message.id`. Tomando la
# primera, `msg_0017` aportaba output 3 en vez de 1060 — 1057 x 5 = 5285.
FREAL=.claude/scripts/tests/fixtures/claude-home
real() {   # $1 = agent_id ; $2 = descripcion ; $3 = patron esperado
    afirmar "$2" "1" "$(CLAUDE_HOME="$FREAL" bash "$SCRIPT" "$1" 2>&1 | grep -c -- "$3")"
}
real ab5a332fb0711f638 "equiv_cost del fixture de contabilidad" "equiv_cost:       595,654"
real ab5a332fb0711f638 "titular_harness (in+cc+out)"            "titular_harness:  281,066"
real ab5a332fb0711f638 "factor equiv/titular"                   "factor:           2.12x"
real ab5a332fb0711f638 "turnos, sin contar <synthetic>"         "turnos:           10"
real ab5a332fb0711f638 "sin reset de cache"                     "resets_de_cache:  0"
real a29f8c2656ce8c9c3 "equiv_cost con dedup por ULTIMA aparicion" "equiv_cost:       1,524,310"
real a29f8c2656ce8c9c3 "output completo (1144, no 87)"          "output:           1,144"
real a29f8c2656ce8c9c3 "reset de cache en el turno 3"           "resets_de_cache:  1  (turno(s) 3)"

# El ALCANCE de la suma (#899, :ref:`h-docs-427`). Sin el, un transcript
# truncado publica el mismo equiv_cost que uno completo: la cifra no dice sobre
# cuantos mensajes se computo. Los 6 del hueco son dedup por `message.id`, no
# huecos — la linea lo declara en vez de dejar al lector adivinar cual de las
# dos causas ocurrio.
real ab5a332fb0711f638 "publica el alcance de la suma" \
     "alcance medido: 10 de 16 mensajes de assistant"
real ab5a332fb0711f638 "y nombra la causa del hueco"   \
     "6 id repetido(s) que el dedup absorbio"

# LO QUE ESTO NO RECUPERA. Las cifras concretas de H-DOCS-169 (equiv_cost
# 1 862 735, factor 4.24x, titular 439 018) y de H-DOCS-171 (resets en los
# turnos 3 y 4) se midieron sobre transcripts que ya no existen y NO se pueden
# reproducir: son evidencia fechada de un episodio, y el momento no cambia
# (`calibration-verified-numbers.md`). Lo que estos fixtures restauran es el
# MECANISMO — que la aritmetica y la deteccion de reset vuelvan a tener un
# instrumento que las mida contra material real.

echo
printf '%d ok, %d fallos, %d omitidos\n' "$OK" "$FALLO" "$OMITIDOS"
if [[ $OMITIDOS -gt 0 ]]; then
    echo "AVISO: $OMITIDOS caso(s) omitidos — el verde NO cubre lo que midieron."
fi
exit $(( FALLO > 0 ))

#!/bin/bash
# Pruebas de wait-jobs.sh + stop-gate-espera-pendiente.sh
#
# La prueba se guarda en el repositorio (`build-logs.md`): un `.log` es tan
# durable como el contenedor, y este par es la única defensa contra el modo de
# fallo de H-DOCS-155.
#
# El control positivo (caso 4) NO es fabricado: reproduce el episodio real —
# la suite escribe su `EXIT=1` y nadie lo recoge. Ése es el test que
# `hallazgo-abierto-genera-sucesor.md` exige, y el que destapó que el
# predicado inicial ("pendiente = no asentado") era ciego al fenómeno.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

GUION=.claude/scripts/session/wait-jobs.sh
HOOK=.claude/hooks/stop-gate-espera-pendiente.sh
export ESPERAR_INTERVALO=1
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

decision_del_gate() {
    echo '{"stop_hook_active":false}' | bash "$HOOK" \
        | python3 -c "import json,sys; print(json.load(sys.stdin).get('decision','ninguna'))"
}

echo "== 1. sintaxis =="
bash -n "$GUION"; afirmar "wait-jobs.sh parsea" 0 $?
bash -n "$HOOK";  afirmar "stop-gate parsea" 0 $?

echo "== 2. barrera positiva: N trabajos que terminan bien =="
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
for i in 1 2; do
    L=$(mktemp); nohup bash -c "sleep $i; echo EXIT=0" >"$L" 2>&1 & P=$!; disown $P
    bash "$GUION" registrar "t$i" "$L" "$P" >/dev/null
done
bash "$GUION" esperar --timeout 30 >/dev/null; afirmar "N trabajos OK -> exit 0" 0 $?
afirmar "ledger vacío tras recoger" "" "$(ls "$KX_TRABAJOS_DIR")"

echo "== 3. un trabajo muere sin marcador =="
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
LA=$(mktemp); nohup bash -c "sleep 1; echo EXIT=0" >"$LA" 2>&1 & PA=$!; disown $PA
LB=$(mktemp); nohup bash -c "echo arrancando; sleep 1; kill -9 \$\$" >"$LB" 2>&1 & PB=$!; disown $PB
bash "$GUION" registrar vivo "$LA" "$PA" >/dev/null
bash "$GUION" registrar muerto "$LB" "$PB" >/dev/null
SALIDA=$(bash "$GUION" esperar --timeout 30); COD=$?
afirmar "un BAIL -> exit 2" 2 "$COD"
grep -q '^BAIL   muerto' <<<"$SALIDA"; afirmar "nombra al que murió" 0 $?
grep -q '^OK     vivo'   <<<"$SALIDA"; afirmar "no arrastra al que sí terminó" 0 $?

echo "== 4. CONTROL POSITIVO — el episodio H-DOCS-155 =="
# La suite TERMINA y escribe su marcador; nadie la recoge; el turno cierra.
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
LS=$(mktemp); printf '7 failed, 3165 passed, 4 skipped\nEXIT=1\n' > "$LS"
bash "$GUION" registrar suite-api "$LS" 999999 >/dev/null
afirmar "terminado y SIN RECOGER -> el gate bloquea" "block" "$(decision_del_gate)"
SALIDA=$(bash "$GUION" esperar --timeout 10)
grep -q '7 failed' <<<"$SALIDA"; afirmar "la recogida IMPRIME el resultado" 0 $?
afirmar "tras recoger, el gate calla" "ninguna" "$(decision_del_gate)"

echo "== 5. el gate no estorba ni reincide =="
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
afirmar "sin trabajos -> no bloquea" "ninguna" "$(decision_del_gate)"
LV=$(mktemp); nohup bash -c "sleep 300" >"$LV" 2>&1 & PV=$!; disown $PV
bash "$GUION" registrar largo "$LV" "$PV" >/dev/null
afirmar "vivo sin marcador -> bloquea" "block" "$(decision_del_gate)"
afirmar "stop_hook_active=true -> no reincide" "ninguna" \
    "$(echo '{"stop_hook_active":true}' | bash "$HOOK" \
        | python3 -c "import json,sys; print(json.load(sys.stdin).get('decision','ninguna'))")"
bash "$GUION" olvidar largo >/dev/null
afirmar "abandono declarado -> el gate lo suelta" "ninguna" "$(decision_del_gate)"
kill $PV 2>/dev/null

echo "== 6. archivar empaqueta el ledger en <id>.tar.gz (T-096) =="
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
KX_TRABAJOS_ARCHIVO_DIR=$(mktemp -d); export KX_TRABAJOS_ARCHIVO_DIR
LJ=$(mktemp); echo "EXIT=0" >"$LJ"
bash "$GUION" registrar demo "$LJ" 99999 >/dev/null
bash "$GUION" archivar sesion-x >/dev/null
afirmar "el .tar.gz existe" 0 "$( [ -f "$KX_TRABAJOS_ARCHIVO_DIR/sesion-x.tar.gz" ]; echo $? )"
afirmar "el archivo trae el .job" "demo" "$(tar -tzf "$KX_TRABAJOS_ARCHIVO_DIR/sesion-x.tar.gz" | grep -oE 'demo' | head -1)"
afirmar "el ledger vivo se vació de .job" 0 "$(find "$KX_TRABAJOS_DIR" -name '*.job' | wc -l | tr -d ' ')"
bash "$GUION" archivar sesion-x >/dev/null; afirmar "archivar en vacío es no-op (exit 0)" 0 $?
unset KX_TRABAJOS_ARCHIVO_DIR

echo "== 7. adopción de un huérfano real (TASK-DOCS-0377) =="
# El huérfano no se fabrica: se produce como en producción. `forget` suelta la
# anotación y DEJA el proceso corriendo (lo dice su propio docstring), así que
# tras él hay un trabajo vivo que ninguna herramienta ve. Ése es el episodio
# que h-docs-1037 registró, y el control positivo que esta sección exige.
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
MARCA="huerfano-$$-$RANDOM"
LH=$(mktemp)
# La forma de lanzamiento es la de `run-task-pool.sh`, no una fabricada: el
# shell EXTERIOR conserva su línea de comando (dos comandos, sin exec) y su
# fd 1 apunta al log. Con `bash -c "cmd"` a secas, bash reemplaza su propia
# imagen por el último comando y la marca desaparece de `ps` — el huérfano
# seguiría vivo y sería inadoptable, que es otro hallazgo, no éste.
# El `; :` final impide que el shell INTERIOR reemplace su imagen por el
# `sleep`: así el árbol tiene DOS procesos que traen la marca, padre e hijo.
# Es lo que hace falsable el guardia de raíz — con un solo proceso, adoptar la
# raíz y adoptar todo dan el mismo número y el control no discrimina.
nohup bash -c 'bash -c "$1"; echo EXIT=$?' _ "echo $MARCA; sleep 300; :" >"$LH" 2>&1 & PH=$!; disown $PH
bash "$GUION" register h1 "$LH" "$PH" >/dev/null
afirmar "el .job registra cmd=" 0 "$(grep -q '^cmd=' "$KX_TRABAJOS_DIR/h1.job"; echo $?)"
afirmar "el .job registra proc_start=" 0 "$(grep -q '^proc_start=' "$KX_TRABAJOS_DIR/h1.job"; echo $?)"
bash "$GUION" forget h1 2>/dev/null
afirmar "tras forget el ledger queda vacío" 0 "$(find "$KX_TRABAJOS_DIR" -name '*.job' | wc -l | tr -d ' ')"
afirmar "pero el proceso sigue vivo (eso ES el huérfano)" 0 "$(kill -0 $PH 2>/dev/null; echo $?)"
SALIDA_ADOPT=$(mktemp)
bash "$GUION" adopt --match "$MARCA" >"$SALIDA_ADOPT" 2>&1
afirmar "adopt anota la RAÍZ del árbol, no cada proceso" 1 \
    "$(grep -c '^adoptado:' "$SALIDA_ADOPT")"
afirmar "adopt lo devuelve al ledger" 1 "$(find "$KX_TRABAJOS_DIR" -name '*.job' | wc -l | tr -d ' ')"
afirmar "adopt recupera el log por /proc/<pid>/fd/1" "$LH" "$(cat "$KX_TRABAJOS_DIR"/*.job 2>/dev/null | sed -n 's/^log=//p')"
# CONTROL — adoptar dos veces NO duplica: un pid ya anotado no se re-registra.
bash "$GUION" adopt --match "$MARCA" >"$SALIDA_ADOPT" 2>&1
afirmar "adoptar dos veces no duplica" 1 "$(find "$KX_TRABAJOS_DIR" -name '*.job' | wc -l | tr -d ' ')"
# CONTROL — el propio `adopt` lleva el RE en su línea de comando. Sin el
# guardia se adoptaría a sí mismo y el ledger nunca volvería a vaciarse.
afirmar "adopt no se auto-adopta" 0 \
    "$(grep -l 'wait-jobs.sh' "$KX_TRABAJOS_DIR"/*.job 2>/dev/null | wc -l | tr -d ' ')"
kill $PH 2>/dev/null

echo "== 8. proc_start distingue un pid RECICLADO (control anulado) =="
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
LR=$(mktemp); nohup bash -c "sleep 300" >"$LR" 2>&1 & PR=$!; disown $PR
bash "$GUION" register r1 "$LR" "$PR" >/dev/null
afirmar "con el proc_start real -> VIVO" "VIVO" "$(bash "$GUION" status | awk '$1=="r1"{print $2}')"
# El guardia ANULADO: se falsea el proc_start guardado — es lo que el kernel
# muestra cuando el pid se reusó. Sin este eje el veredicto seguiría siendo
# VIVO y se adoptaría un proceso ajeno como si fuera el trabajo original.
sed -i 's/^proc_start=.*/proc_start=1/' "$KX_TRABAJOS_DIR/r1.job"
afirmar "con el proc_start falseado -> RECICLADO" "RECICLADO" "$(bash "$GUION" status | awk '$1=="r1"{print $2}')"
kill $PR 2>/dev/null

# El eje sólo sirve si `wait` lo consume: es su sitio, no `status`. Sin
# cablearlo ahí, un pid reciclado se lee VIVO y la barrera agota su timeout
# esperando a un proceso ajeno — sale 3 en vez de 2, y el turno cierra creyendo
# que el trabajo sigue en marcha.
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
LW=$(mktemp); nohup bash -c "sleep 300" >"$LW" 2>&1 & PW=$!; disown $PW
bash "$GUION" register w1 "$LW" "$PW" >/dev/null
sed -i 's/^proc_start=.*/proc_start=1/' "$KX_TRABAJOS_DIR/w1.job"
bash "$GUION" wait --timeout 6 >/dev/null 2>&1
afirmar "wait consume el eje: reciclado -> exit 2, no timeout 3" 2 $?
kill $PW 2>/dev/null

echo "== 9. la salida de estado no arrastra el token del renombre (ERR-028) =="
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
afirmar "el resumen dice 'estado:'" "estado:" "$(bash "$GUION" status | awk '{print $1}')"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))

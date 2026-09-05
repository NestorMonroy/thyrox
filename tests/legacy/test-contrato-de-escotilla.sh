#!/bin/bash
# Pruebas del CONTRATO de la escotilla — no de su efecto.
#
# Una escotilla es la vía declarada para saltarse un gate. Su efecto ya se
# probaba (`test-wait-jobs.sh:77`: el gate suelta el trabajo). Lo que
# NO se probaba es su contrato: con qué código sale, por qué canal avisa, y
# si distingue «solté un trabajo» de «no había nada que soltar».
#
# La distinción importa porque el propio test que la ejercitaba la silenció:
#
#     bash "$GUION" olvidar largo >/dev/null
#
# Un aviso escrito a **stdout** desaparece con el primer `>/dev/null`. Por eso
# el contrato exige **stderr**: el canal que sobrevive a que alguien descarte
# la salida. Es el sub-patrón D de `metrica-decide-la-conclusion.md` aplicado
# a una escotilla — un verde que no distingue el abandono real del vacío.
#
# Idea adoptada de `claw-code: tests/test_pre_push_hook_contract.py` (MIT,
# 08106b0), cuyo primer caso afirma que su escotilla sale 0 **y** deja su
# aviso en stderr. Aquí se adapta al único gate nuestro con escotilla de
# guion; `--no-verify` no es una: la sirve git y salta el hook entero (#434).

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

GUION=.claude/scripts/session/wait-jobs.sh
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR

echo "== 1. la escotilla sobre un trabajo REAL =="
bash "$GUION" registrar presente /dev/null 0 >/dev/null 2>&1
salida_out=$(bash "$GUION" olvidar presente 2>/dev/null)
codigo=$?
afirmar "sale 0" 0 "$codigo"

bash "$GUION" registrar presente /dev/null 0 >/dev/null 2>&1
salida_err=$(bash "$GUION" olvidar presente 2>&1 >/dev/null)
afirmar "el aviso viaja por stderr (sobrevive a >/dev/null)" \
    "sí" "$([[ -n "$salida_err" ]] && echo sí || echo no)"
afirmar "el aviso NOMBRA la etiqueta soltada" \
    "sí" "$(grep -q presente <<<"$salida_err" && echo sí || echo no)"

echo "== 2. la escotilla sobre lo que NO existe — el control que discrimina =="
salida_err=$(bash "$GUION" olvidar jamas-registrada 2>&1 >/dev/null)
codigo=$?
afirmar "NO sale 0: no se absuelve lo que nunca estuvo" \
    "distinto-de-0" "$([[ "$codigo" -ne 0 ]] && echo distinto-de-0 || echo 0)"
afirmar "y NO afirma haber olvidado nada" \
    "no" "$(grep -qi 'olvidado' <<<"$salida_err" && echo sí || echo no)"

echo "== 3. el ledger queda como debe =="
bash "$GUION" registrar otra /dev/null 0 >/dev/null 2>&1
bash "$GUION" olvidar otra >/dev/null 2>&1
afirmar "el trabajo soltado desaparece del ledger" \
    0 "$(find "$KX_TRABAJOS_DIR" -name '*.job' 2>/dev/null | wc -l)"

rm -rf "$KX_TRABAJOS_DIR"
echo
printf '%d ok · %d falla(s)  (alcance medido: 1 escotilla de guion; --no-verify no lo es)\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))

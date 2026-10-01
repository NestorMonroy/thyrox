#!/usr/bin/env bash
# Anulaciones del detector y del clasificador de rechazos: se retira cada
# mitad de juicio y se mide qué casos caen.
set -u
T=/home/user/thyrox; cd "$T"; export PYTHONDONTWRITEBYTECODE=1
D=src/hooks/detect_classifier_outage.py; C=src/hooks/classifier_rejection.py
run() { for t in tests/hooks/test_classifier_rejection.py tests/hooks/test_detect_classifier_outage.py; do python3 "$t" | grep -E '^FAIL|caso'; done; }
annul() { local f=$1 old=$2 new=$3; cp "$f" "$f.orig"; OLD="$old" NEW="$new" bash bin/replace_literal "$f" >/dev/null && run; mv "$f.orig" "$f"; }
echo "== 1: un Bash que pasa no corta la racha"
annul $D "        if rejection is None or rejection.kind == \"judged\":" "        if rejection is not None and rejection.kind == \"judged\":"
echo "== 2: un rechazo con veredicto no corta la racha"
annul $D "        if rejection is None or rejection.kind == \"judged\":" "        if rejection is None:"
echo "== 3: cuenta cualquier herramienta, no sólo Bash"
annul $D "                    and names.get(block.get(\"tool_use_id\", \"\")) == _CLASSIFIED_TOOL:" "                    and block.get(\"tool_use_id\") in names:"
echo "== 4: sin corte de turno en el mensaje del usuario"
annul $D "    for rejection in _bash_results(current_turn(entries)):" "    for rejection in _bash_results(entries):"
echo "== 5: sin la rama de falla dura"
annul $C "    return Rejection(\"hard\" if _HARD_MARK in text else \"transient\", cause)" "    return Rejection(\"transient\", cause)"
echo "== 6: sin reconocer el veredicto"
annul $C "    if _JUDGED_MARK in text:
        return Rejection(\"judged\", None)
" ""
echo "== 7: el detector habla ante cualquier herramienta"
annul $D "    if payload.get(\"tool_name\") != _CLASSIFIED_TOOL or not isinstance(transcript, str):" "    if not isinstance(transcript, str):"
echo "== restaurado"; git status --short -- src/hooks | head; run

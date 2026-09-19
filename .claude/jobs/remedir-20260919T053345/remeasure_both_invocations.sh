#!/usr/bin/env bash
# Mide las cinco suites de las DOS maneras: la invocacion pelada que use al
# publicar la atribucion, y la del corredor real (`tests/run.sh:38` exporta
# PYTHONPATH="$PWD/src"). El eje es el VEREDICTO, no el conteo.
cd /home/user/thyrox
find src tests -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null
printf '%-46s %-10s %s\n' "SUITE" "pelado" "PYTHONPATH=src"
for s in tests/hooks/test_error_log.py \
         tests/agents/test_final_message_closing.py \
         tests/session/test_user_wiring.py \
         tests/paths/test_child_env.py \
         tests/session/test_generate_bin.py ; do
  env -u PYTHONPATH python3 "$s" >/dev/null 2>&1 && a=ok || a=ROJO
  PYTHONPATH="$PWD/src" python3 "$s" >/dev/null 2>&1 && b=ok || b=ROJO
  printf '%-46s %-10s %s\n' "$s" "$a" "$b"
done
echo "EXIT=$?"

#!/usr/bin/env bash
# Tres anulaciones de la política de calibración; cada una debe tumbar sólo
# lo que depende de ella. Restaura el módulo al terminar.
cd /home/user/thyrox
B=.claude/workbench/vram-calibration-20260926T220529; M=src/session/pool_history.py; P=$B/pool_history.pre-annulment.py
annul() { # nombre viejo nuevo [pool]
  printf '%s' "$2" > "$B/an-$1-old.txt"; printf '%s' "$3" > "$B/an-$1-new.txt"
  cp "$P" "$M"; bash bin/replace_literal --old-file "$B/an-$1-old.txt" --new-file "$B/an-$1-new.txt" "$M" >/dev/null || echo "NO APLICÓ $1"
  echo "## anulación $1"
  python3 tests/session/test_pool_history.py 2>&1 | grep -E "FALLA|falla\(s\)"
  [[ -n "${4:-}" ]] && bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|aserciones"
}
echo "## verde"; python3 tests/session/test_pool_history.py 2>&1 | tail -1
bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|dos pools|sin calibrar|GNU time real|aserciones"
annul always-calibrated '    if row is None:
        return False, "sin ejecución previa de esta plantilla"' '    return True, "calibrado"
    if row is None:
        return False, "sin ejecución previa de esta plantilla"' pool
annul no-exclusive '    return exclusive_mib, f"pide la GPU entera' '    return None, f"pide la GPU entera' pool
annul no-coverage '    row["items_gpu_measured"] = sum(' '    _coverage = sum('
cp "$P" "$M"; cmp "$M" "$P" && echo restaurado

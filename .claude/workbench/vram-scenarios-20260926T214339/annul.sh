#!/usr/bin/env bash
# Cuatro anulaciones sobre gpu_monitor.py; cada una debe tumbar SÓLO sus casos.
cd /home/user/thyrox
B=.claude/workbench/vram-scenarios-20260926T214339; M=src/session/gpu_monitor.py; P=$B/gpu_monitor.pre-annulment.py
annul() {
  printf '%s' "$2" > "$B/an-$1-old.txt"; printf '%s' "$3" > "$B/an-$1-new.txt"
  cp "$P" "$M"; bash bin/replace_literal --old-file "$B/an-$1-old.txt" --new-file "$B/an-$1-new.txt" "$M" >/dev/null || echo "NO APLICÓ $1"
  echo "## anulación $1"; timeout 120 python3 tests/session/test_gpu_scenarios.py 2>&1 | grep -E "FALLA|falla\(s\)"
}
annul no-lock '        with shared_lock.held(book.path, run_id="vram-admission", retries=LEDGER_LOCK_RETRIES,
                              min_wait_s=0.01, max_wait_s=0.2):' '        with open("/dev/null"):'
annul full-reservation '        total += max(0, mib - used)' '        total += mib'
annul no-descendants '        seen.add(current)
        for children' '        seen.add(current)
        break
        for children'
annul zombie-alive '    return stat.rsplit(")", 1)[-1].split()[0] not in ("Z", "X")' '    return True'
cp "$P" "$M"; cmp "$M" "$P" && echo "restaurado"

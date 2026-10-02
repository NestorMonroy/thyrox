from pathlib import Path
p = Path('tests/session/test-headless-pool-execution-unit.sh'); s = p.read_text()
pairs = [
('"--work ai-course-notes:cs224r/1 --owner pool:cs224r-1;|--work ai-course-notes:cs224r/2 --owner pool:cs224r-2;|"',
 '"--work ai-course-notes:cs224r/1;--owner pool:cs224r-1;|--work ai-course-notes:cs224r/2;--owner pool:cs224r-2;|"'),
('''# El runner de la primitiva: anota la autorización y ejecuta el payload sin el entorno del pool.
cat > "$F/execute" <<R
#!/usr/bin/env bash
[[ "\\$1" == run ]] || exit 2
args=(); while [[ \\$# -gt 0 && "\\$1" != "--" ]]; do args+=("\\$1"); shift; done; shift
printf '%s\\n' "\\${args[*]}" >> "$F/execute.log"
exec env -i PATH="\\$PATH" HOME="\\$HOME" "\\$@"
R''',
'''# El runner de la primitiva: anota la autorización y ejecuta el payload sólo con
# las variables que la autorización nombra con --env, como la unidad real.
cat > "$F/execute" <<R
#!/usr/bin/env bash
[[ "\\$1" == run ]] || exit 2
args=(); keep=(); while [[ \\$# -gt 0 && "\\$1" != "--" ]]; do
  [[ "\\$1" == --env ]] && keep+=("\\$2=\\${!2}"); args+=("\\$1"); shift; done; shift
printf '%s\\n' "\\${args[*]}" >> "$F/execute.log"
exec env -i PATH="\\$PATH" HOME="\\$HOME" "\\${keep[@]}" "\\$@"
R'''),
]
for old, new in pairs:
    assert s.count(old) == 1, old[:60]; s = s.replace(old, new)
p.write_text(s); print('ok')

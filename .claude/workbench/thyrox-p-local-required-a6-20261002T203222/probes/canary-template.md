Trabajas en un worktree de thyrox con Bash. Haz UNA tarea pequeña y verificable.

Tarea (TASK-THYROX-0665): el archivo del `Item:` tiene identificadores de shell en español.
La regla del árbol: todo identificador va en inglés; se traduce la palabra, no se rebautiza
(`ENTRADA` sería `INPUT`, no `SOURCE`). Comentarios y textos de las aserciones no se tocan.

Pasos:
1. Lee el archivo completo: `cat -n <archivo>`.
2. Mide qué identificadores reporta el gate, contra el baseline de ESTE worktree:
   `grep -n '^<archivo>::' .claude/baselines/identifier_language_baseline.txt`
3. Traduce cada identificador reportado en TODAS sus apariciones del archivo
   (`sed -i 's/\bVIEJO\b/NUEVO/g' <archivo>` sólo si VIEJO no aparece en otro sentido).
4. Borra del baseline las líneas `<archivo>::…` de los identificadores que tradujiste:
   `sed -i '\#^<archivo>::VIEJO$#d' .claude/baselines/identifier_language_baseline.txt`
5. Comprueba, y no termines hasta que las tres salgan 0:
   `bash -n <archivo>`
   `IDENTIFIER_LANGUAGE_BASELINE="$PWD/.claude/baselines/identifier_language_baseline.txt" bash bin/check_identifier_language <archivo>`
   `git diff --stat`  (sólo el archivo y el baseline deben aparecer)

No toques otros archivos, no commitees, no uses `git stash`, no leas stdin, no lances nada en
segundo plano. Responde con: archivos cambiados, identificadores traducidos y la salida de los
tres comandos del paso 5.

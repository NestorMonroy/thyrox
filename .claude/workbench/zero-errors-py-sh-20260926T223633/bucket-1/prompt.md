Trabajas en /home/user/thyrox (rama feature/thyrox-l6). Objetivo: dejar en CERO los errores de pyright y de ruff en los archivos Python de TU lista, sin cambiar la conducta.

Tu lista (sólo estos archivos; no toques ningún otro): .claude/workbench/zero-errors-py-sh-20260926T223633/bucket-1.txt

Medir (desde /home/user/thyrox; pyright lee [tool.pyright] de pyproject.toml):
  pyright $(cat .claude/workbench/zero-errors-py-sh-20260926T223633/bucket-1.txt)
  ruff check --no-cache --select E9,F63,F7,F82,F401,F811,F841 $(cat .claude/workbench/zero-errors-py-sh-20260926T223633/bucket-1.txt)

Criterios, en este orden:
1. Arreglar la causa, no silenciar. En tests, estrechar con `assert x is not None` antes de usar un Optional; en src, anotar bien (p. ej. `dict[str, Any]` para un dict de kwargs heterogéneo, `int | float` si la función de verdad acepta float) o manejar el None de verdad.
2. `# pyright: ignore[regla]` sólo cuando el analizador no puede ver algo real (import dinámico, stub ausente), con un comentario en español que diga por qué. Nunca `# type: ignore` a secas ni `cast` para tapar un error que es real.
3. ruff F401/F841: borrar el import/variable muerto; F811 (redefinición): averiguar cuál de las dos definiciones corre y borrar la muerta — si difieren, repórtalo; F821: es un bug, corrígelo.
4. Si un error de tipo destapa un BUG real (un None que sí puede llegar, un argumento que de verdad es de otro tipo), corrígelo y repórtalo aparte.
5. Identificadores en inglés, comentarios en español. Edita con Bash (sed -n para leer; `bash bin/replace_literal --old-file A --new-file B archivo` con A/B escritos por heredoc para reemplazos literales). No reescribas un archivo entero.
6. No borres ni debilites aserciones de test.

Verificar: re-corre pyright y ruff sobre tu lista (0 esperado) y ejecuta CADA archivo de test tocado, y los tests que importan cada archivo de src tocado:
  PYTHONPATH=src .venv/bin/python <test.py>      (o `.venv/bin/python -m pytest -q <test.py>` si el archivo es de pytest)
Ejecuta esos tests también ANTES de editar y guarda la salida en .claude/workbench/zero-errors-py-sh-20260926T223633/bucket-1/ (p. ej. .claude/workbench/zero-errors-py-sh-20260926T223633/bucket-1/before-<nombre>.out): un test que ya fallaba antes se reporta como preexistente, no como tuyo.

NO hagas git add/commit/push. Al terminar escribe tu informe en .claude/workbench/zero-errors-py-sh-20260926T223633/bucket-1/report.md (markdown): conteos antes/después de pyright y ruff sobre tu lista, archivos tocados, bugs reales encontrados (archivo:línea y qué), cualquier supresión con su razón, y resultado de cada test ejecutado. Tu mensaje final: sólo los conteos y la ruta del informe.

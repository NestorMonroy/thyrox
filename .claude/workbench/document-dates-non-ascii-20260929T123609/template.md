# `fechar-documentos` no fecha los documentos con rutas no ASCII (H-THYROX-270)

Trabajas en un worktree de thyrox. Identificadores en inglés; comentarios en
español. No toques `.claude/`.

## El defecto (medido)

`_last_commit_dates` en `src/agents/agent_store.py` corre
`git log --format=@%cI --name-only -- <subtree>` y usa cada línea como ruta.
Con `core.quotePath` por defecto, git **entrecomilla y escapa en octal** las
rutas con bytes no ASCII:

```
"source/.../hallazgo-H-DOCS-200-el-bloqueo-externo-de-un-cycle-se-med\303\255a-por-miembro.rst"
```

Así la clave del diccionario nunca coincide con la ruta real, y en el store
real quedan exactamente 3 de 6508 documentos sin `commit_at` ni
`updated_at`: los tres con una `í` en el nombre.

## Qué hacer (TDD)

1. Prueba roja primero, en `tests/agents/test-agent-store-fecha-documento.sh` (la suite existente; mira su forma). Búscala también con
   `rg -l "_last_commit_dates|date_documents|fechar-documentos" tests/`):
   un repo git temporal con un archivo cuyo nombre lleve `í`, un commit, y
   la aserción de que `_last_commit_dates` devuelve la fecha bajo la ruta
   tal cual (UTF-8, sin comillas).
2. Arreglo: pasa `-c core.quotePath=false` a git **o** usa `-z` y separa por
   NUL (preferible: `-z` también resiste saltos de línea en el nombre).
   Decide y justifícalo en el docstring.
3. Control de anulación: retira el arreglo y comprueba que cae exactamente
   la aserción nueva; restaura.
4. Corre la suite de `agent_store` entera y reporta rojo inicial, anulación
   y verde final.

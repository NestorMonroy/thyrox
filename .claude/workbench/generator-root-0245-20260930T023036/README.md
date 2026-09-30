# TASK-THYROX-0245 — el generador de bin/ construye el árbol que lo contiene

## Premisa medida

La tarea decía que el `.env` versionado fija `THYROX_ROOT=/home/user/thyrox`
y que toda copia hereda la raíz del clon original. Medido el 2026-09-30:

- `.env` **no** está versionado: `git ls-files .env` da 0 y
  `git check-ignore .env` lo confirma. Se sacó del índice en `ae7fd40d` y
  `ef9e535d`. Esa mitad de la tarea ya estaba cerrada.
- La otra mitad sí se reproduce, pero por otra vía: `reach.thyrox_root()`
  da precedencia a la variable del proceso (`THYROX_ROOT`) sobre el ascenso
  desde el archivo. Una copia o un worktree hereda la variable de la sesión, y
  `generate_bin.py` construía el `bin/` del clon original.

## Cambio

`generate_bin.repository_root()` localiza su árbol por ascenso desde su propio
archivo hasta el marcador (`src/paths/reach.py`) y sólo sin marcador delega en
`reach.thyrox_root()`. La precedencia general de `thyrox_root()` no se toca:
es la misma que `install.sh` escribe y la usan los consumidores.

## Evidencia

| Archivo | Qué muestra |
|---|---|
| `red-generate-bin.log` | con el código anterior: 121 de 122; cae sólo el caso nuevo |
| `green-generate-bin.log` | con el cambio: todo verde |

## Lo que no cierra

Los envoltorios de `bin/` resuelven `THYROX_ROOT="${THYROX_ROOT:-<su ubicación>}"`:
con la variable heredada, `bin/<x>` de una copia ejecuta el código del clon
original. El pool ya exporta `THYROX_ROOT` por worktree (TASK #250), así que
sus ítems no lo sufren. Para cualquier otra copia sigue abierto; cambiar esa
precedencia afecta a todos los envoltorios y es una decisión aparte.

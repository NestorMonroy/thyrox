Haces que el caso 17.3 de `tests/session/test_user_wiring.py` arme su propia disposición de
clones hermanos, en vez de depender de dónde viva el árbol (H-THYROX-259). El `Item:` de abajo
nombra el único archivo que te pertenece; no toques ningún otro. Edita con `sed`, `gawk` o
`bash bin/replace_literal`; para Python usa `uv run --python 3.12 python`.

Lo que se sabe, medido:
- 17.3 (línea ~580) pasa `cwd=str(HERE.parent / "kaupamex-docs")`, con `HERE = reach.thyrox_root()`,
  y resuelve `../thyrox/src/packages/agent/bin/preModelSwitch.ts` contra él. Exige que el padre de
  la raíz contenga `thyrox/src/packages/agent/bin/preModelSwitch.ts`.
- En el árbol principal eso se cumple y pasa. En un worktree del pool (`.thyrox/pool-worktrees/<n>`)
  el padre es `.thyrox/pool-worktrees` y 17.3 falla, con y sin cualquier otro cambio.

Lo que se pide:
1. Mitad roja primero: comprueba y publica que 17.3 falla en tu worktree tal como está.
2. Que 17.3 construya en un directorio temporal (`tempfile.TemporaryDirectory`, retirado al salir)
   la disposición `<tmp>/kaupamex-docs/` y `<tmp>/thyrox/src/packages/agent/bin/preModelSwitch.ts`
   (archivo vacío basta), y use `cwd=<tmp>/kaupamex-docs`. El caso sigue midiendo lo mismo: el
   comando real del consumidor, resuelto desde el cwd correcto, NO se reporta como roto.
3. No cambies 17.1, 17.2, 17.4–17.6 ni la sección 17-bis salvo lo imprescindible. La 17-bis declara
   qué cae al retirar la rama relativa; confirma que sigue siendo verdad y publica sus conteos.
4. Control de anulación propio: si el archivo de la disposición temporal no se crea, 17.3 debe caer
   (y sólo 17.3). Publica los conteos y restaura.
5. Comentarios en español, sin coloquialismos; el comentario del caso nombra H-THYROX-259.

Cierre del ítem (obligatorio):
- Todo en primer plano. No lances trabajos en segundo plano, no uses `git stash` ni termines
  esperando una notificación.
- Tu mensaje final incluye la roja inicial, el verde final de
  `uv run --python 3.12 python tests/session/test_user_wiring.py` (conteo de ok/FALLO) y los dos
  controles de anulación con sus conteos.

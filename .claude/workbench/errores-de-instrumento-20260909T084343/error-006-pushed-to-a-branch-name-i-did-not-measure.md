# ERR-006 — empujé a un nombre de rama tomado del bloque de arranque

**Hice:** `git push -u origin claude/kaupamex-nuevo-entorno-nrcglx` en `thyrox`.

**Medido:** la rama real de `thyrox` es `feature/thyrox-l0`; los cinco
consumidores están en `feature/kaupamex-l4`. El nombre del bloque de arranque no
describe este árbol.

**Salida:** `src refspec … does not match any`.

**Quién lo delató:** git.

**Corrección aplicada:** leer `git branch --show-current` antes de cada push, en
vez de reusar un nombre heredado del contexto.

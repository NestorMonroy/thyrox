# ERR-002 — escribí las rutas del árbol a mano teniendo el mecanismo que las da

**Hice:** ~15 comandos con `/home/user/kaupamex-*` y `/home/user/thyrox`
literales.

**Medido:** `thyrox: src/paths/reach_roots.py` existe, funciona, y
`tree_root()` / `roots()` devuelven **exactamente** esas rutas. No era que el
mecanismo faltara: era que no lo invoqué.

**Atenuante medido, no supuesto:** **0** ocurrencias de `/home/user` en los
cuatro archivos que commiteé. El defecto quedó en comandos efímeros, no en el
árbol.

**Quién lo delató:** el ejecutor — *«que paso con las constantes que se supone
tienes que usar?»*.

**Sucesor:** tarea #144 (migrar los guiones que aún codifican la raíz a mano).

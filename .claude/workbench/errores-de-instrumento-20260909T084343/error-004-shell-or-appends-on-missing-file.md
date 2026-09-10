# ERR-004 — `&&` … `||` apendó la ruta cuando el archivo no existía

**Escribí:**

```bash
[ -f X ] && git diff --quiet -- X || P="$P X"
```

**Qué hace de verdad:** si `-f` falla, la cadena `&&` es falsa y el `||`
**ejecuta el apéndice igual**. La ruta entra en el pathspec aunque no exista.

**Consecuencia observada:** `pathspec … did not match any file(s) known to git`
en `db` y `server`.

**Quién lo delató:** git, al rechazar el commit.

**Corrección aplicada:** commitear sólo la ruta que sí existe en cada repo.

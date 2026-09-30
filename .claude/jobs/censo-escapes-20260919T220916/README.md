# censo-escapes

## Qué se lanzó

```
bash -c cd /home/user/thyrox && PYTHONPATH=src python3 - <<"PY"
from pathlib import Path
from typescript import emit_declarations as mod
limpios, con_escape = [], []
for d in sorted(list(Path("src/packages").glob("*/")) + list(Path("src/packages/@ant").glob("*/"))):
    if not (d / "package.json").is_file():
        continue
    esc = mod.escaping_files(d)
    (con_escape if esc else limpios).append((d.name, esc))
print(f"emitibles sin derrame: {len(limpios)} de {len(limpios)+len(con_escape)}")
for n, e in con_escape:
    print(f"  {n}: {len(e)} escape(s) -> {list(e)[:4]}")
PY
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

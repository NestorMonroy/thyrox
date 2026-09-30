# repl-diag

## Qué se lanzó

```
bash -c cd /home/user/thyrox && python3 -c "
import sys; sys.path.insert(0,'src')
from pathlib import Path
from typescript import emit_declarations as m
r = m.emit_package(Path('src/packages/repl'))
import re
for l in r.output.splitlines():
    if 'useReplAppState' in l or 'error TS9' in l or 'error TS4' in l:
        print(l)
" | head -20
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

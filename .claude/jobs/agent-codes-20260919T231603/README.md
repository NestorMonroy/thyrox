# agent-codes

## Qué se lanzó

```
bash -c cd /home/user/thyrox && python3 -c "
import sys; sys.path.insert(0,'src')
from pathlib import Path
from typescript import emit_declarations as m
r = m.check_package(Path('src/packages/agent'))
open('.claude/jobs/repunte-inerte-20260919T230746/agent-salida.txt','w').write(r.output)
print(r.verdict())
"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

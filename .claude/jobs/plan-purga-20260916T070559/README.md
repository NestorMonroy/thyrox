# plan-purga

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run --silent -e "
import { collectAllProjectsPurgeItems } from \"./src/packages/storage/src/projectPurge.ts\";
const plan = await collectAllProjectsPurgeItems();
console.log(JSON.stringify(plan, null, 1).slice(0, 4000));
" 2>&1 | head -60
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

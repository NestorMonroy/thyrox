# policy-wiring-subset3

## Qué se lanzó

```
bash -c cd src/packages && bun test $(cat /home/user/thyrox/.claude/workbench/policy-settings-port-20260927T083804/probes/wiring-subset.txt | tr '\n' ' ') && cd config && timeout 400 bunx tsc -p tsconfig.test.json --noEmit
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

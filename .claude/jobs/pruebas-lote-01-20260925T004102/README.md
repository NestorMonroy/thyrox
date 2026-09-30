# pruebas-lote-01

## Qué se lanzó

```
bash -c timeout 1500 bun test $(cat .claude/workbench/copia-desde-ccnmt/lote-01/pruebas-derivadas.txt) > .claude/workbench/copia-desde-ccnmt/lote-01/pruebas.log 2>&1; echo exit=$? >> .claude/workbench/copia-desde-ccnmt/lote-01/pruebas.log; bun src/verify/message_shape_audit.ts > .claude/workbench/copia-desde-ccnmt/lote-01/shape.log 2>&1
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

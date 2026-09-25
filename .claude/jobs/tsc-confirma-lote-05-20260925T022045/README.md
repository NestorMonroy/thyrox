# tsc-confirma-lote-05

## Qué se lanzó

```
bash -c bunx tsc --noEmit -p tsconfig.json > .claude/workbench/copia-desde-ccnmt/lote-05/confirma-tras-pruebas.log 2>&1; grep -c 'error TS' .claude/workbench/copia-desde-ccnmt/lote-05/confirma-tras-pruebas.log; bun src/verify/message_shape_audit.ts > .claude/workbench/copia-desde-ccnmt/lote-05/shape-tras-pruebas.log 2>&1; tail -1 .claude/workbench/copia-desde-ccnmt/lote-05/shape-tras-pruebas.log
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

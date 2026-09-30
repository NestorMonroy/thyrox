# tsc-zero

## Qué se lanzó

```
bash -c cd /home/user/thyrox; echo "== gate de la CLI (2 proyectos)"; bash bin/check-cli-typecheck; echo "gate_exit=$?"; echo "== tsc raíz"; bunx tsc --noEmit -p tsconfig.json > .claude/build-logs/tsc-root.log 2>&1; echo "tsc_root_exit=$? errores=$(grep -c "error TS" .claude/build-logs/tsc-root.log)"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

# uv-in-unit-probe

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0769 --kind probe --env THYROX_EXECUTION_ENTRY -- bash -c command -v uv || echo "uv: ausente"; uv --version 2>&1; ls -d /home/user/thyrox/.venv 2>&1; echo probe-exit=$?
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

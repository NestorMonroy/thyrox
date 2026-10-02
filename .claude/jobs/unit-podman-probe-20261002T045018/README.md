# unit-podman-probe

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0743 --kind probe -- bash -c command -v podman || echo "podman: ausente en PATH"; ls -la /run/podman/podman.sock /run/user/0/podman/podman.sock 2>&1 | head -2; podman ps 2>&1 | head -2; echo probe-exit=$?
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

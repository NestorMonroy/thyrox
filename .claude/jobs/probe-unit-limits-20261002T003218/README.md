# probe-unit-limits

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0754 --kind test --cpus 1 --memory-mib 256 -- bash -c echo memory.max=$(cat /sys/fs/cgroup/memory.max); echo cpu.max=$(cat /sys/fs/cgroup/cpu.max)
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

# probe-unit-tools

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0755 --kind maintenance -- bash -c id -un; pwd; for t in uv python3 xelatex git gawk; do printf "%s=%s\n" $t "$(command -v $t || echo AUSENTE)"; done; ls -d /home/user/ai-course-notes /home/user/thyrox 2>&1; env | awk -F= "/KEY|TOKEN|SECRET|PASSWORD/{print \"secreto-visible:\" \$1}"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

# probe-unit-tools2

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0755 --kind maintenance --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw -- bash -c id -un; for t in uv python3 xelatex git gawk parallel; do printf "%s=%s\n" $t "$(command -v $t || echo AUSENTE)"; done; ls -d /home/user/ai-course-notes/tools /home/user/thyrox/bin; env | gawk -F= "/KEY|TOKEN|SECRET|PASSWORD/{print \"secreto-visible:\" \$1}"; echo fin
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

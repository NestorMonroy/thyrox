# coordinator-admit-qwen-hf

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0912 --kind probe --network host --mount /root/.claude/model-scheduling:/root/.claude/model-scheduling:ro --env THYROX_MODEL_COORDINATOR_SOCKET --env THYROX_EXECUTION_ENTRY -- bash -c timeout 900 bun /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/probes/coordinator_admit.ts thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e 24663 > /home/user/thyrox/.claude/workbench/fresh-clone-flow-20261002T230500/outputs/coordinator-admit-unit.txt 2>&1; echo exit=$? >> /home/user/thyrox/.claude/workbench/fresh-clone-flow-20261002T230500/outputs/coordinator-admit-unit.txt
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

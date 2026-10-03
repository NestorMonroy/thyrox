# finding-312

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0763 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; bash bin/agent_store agregar-hallazgo --finding-id H-THYROX-312 --submodule thyrox --initiative traducir-ai-course-notes-es-mx --severity MEDIA --summary "El Qwen 2.5 7B Q4_K_M del volumen de Ollama no es el artefacto oficial verificado; se admite como divergencia declarada" --content "El catálogo de thyrox declara desde 2026-10-01 thyrox-library--qwen2.5-7b-instruct:q4_k_m-ollama-845dbda0ea48 (source ollama, repository library/qwen2.5-7b-instruct, GGUF sha256 2bada8a7…, 4683073952 B), bajado de registry.ollama.ai. La política es-MX pedía sólo los shards oficiales Qwen/Qwen2.5-7B-Instruct-GGUF (3993201344 + 689872288 B). El encabezado GGUF del blob declara Qwen2.5 7B Instruct, apache-2.0, file_type 15 (Q4_K_M), 339 tensores. No se verificó que sus tensores sean los del fusionado oficial; el ejecutor decidió admitirlo (2026-10-02) con el selector source=ollama (TASK-THYROX-0763). Condición de cierre: comparar los 339 tensores contra los shards oficiales leídos en flujo. Además, hallazgo_ids propose-id no corrió: exige el clon kaupamex-docs, ausente; el número sale del mayor del store (311) más uno." --source-ref "ai-course-notes: tools/lang/es-mx/model-policy.json; thyrox: .thyrox/models/catalog.json" 2>&1 | tail -2
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*

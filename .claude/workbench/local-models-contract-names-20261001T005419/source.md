# Fuente de verdad — declarar un modelo que ya tiene nombre contractual

Tarjeta: TASK-THYROX-0707 (corrección sobre lo integrado en `thyrox@cb4df38a1`).

## Defecto medido (2026-10-01)

`bash bin/local-models-catalog declare thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf`
registró en Ollama y en el catálogo
`thyrox-library--thyrox-qwen--qwen2.5-0.5b-instruct-q4_k_m-hf-7ae557604adf:q4_k_m-ollama-b7c0272e2d21`
con `repository: library/thyrox-qwen--…`, `source: ollama` y la revisión del
manifiesto de Ollama. El modelo es el GGUF de `Qwen/Qwen2.5-0.5B-Instruct` en
el commit HF `7ae557604adf67be50417f59c2c2f167def9a775`: la entrada mentía
sobre su procedencia. Causa: `declareInstalledModel`
(`src/packages/local-models/declareInstalledModel.ts`) toma todo nombre como
un modelo de la biblioteca de Ollama (`repositoryOfOllamaName`, `source:
'ollama'`) y nunca consulta `parseThyroxModelName` (`model-artifacts/modelName.ts`).
El alias y la entrada se retiraron a mano.

## Qué se construye

1. Si `parseThyroxModelName(nombre)` reconoce el nombre, la entrada conserva
   su identidad: repositorio, cuantización y fuente del nombre. La revisión
   completa:
   - fuente `ollama`: es el digest del manifiesto (`/api/tags`), y su prefijo
     de 12 tiene que coincidir con el del nombre; si no, rehúsa nombrando los
     dos;
   - fuente `hf`: la da `--revision <40 hex>` y su prefijo tiene que coincidir;
     sin `--revision`, rehúsa y dice que la hace falta (el nombre sólo lleva
     12 caracteres).
   El nombre ya es contractual: no se vuelve a copiar en Ollama (`/api/copy`
   sólo si el nombre calculado difiere del instalado).
2. Un nombre que no es contractual sigue el camino de hoy.
3. `local-models-catalog declare <nombre> [--revision <commit>]` y su ayuda.

Casos mínimos: contractual `hf` con `--revision` correcta (identidad
conservada, sin copia); `hf` sin `--revision` (rehúsa); `hf` con prefijo
distinto (rehúsa); contractual `ollama` (revisión completa del manifiesto,
sin copia); `ollama` con digest que no coincide (rehúsa); nombre de biblioteca
(camino de hoy, con copia). Controles de anulación con números.

# proxy-open-models

## El encargo

«¿qué pasa con poder usar el proxy? ¿y open model?»

## El proxy: el pool ya lo usa

`headless-pool` en `inherit` hace que cada `thyrox -p` entre al proxy local
(C7), `bin/provider-local-proxy` (`src/packages/provider/bin/localProxy.ts`).
Ese binario conecta UN upstream: `claude-cli`, que atiende cada petición
lanzando `claude -p` y devuelve las tools al cliente por el puente MCP. Los
pools de hoy corrieron así (H-THYROX-291).

## Modelos abiertos: la gobernanza dice Proxy, y el Proxy no tiene la ruta

ADR-THYROX-007: «Ollama — generación LLM local, alcanzada sólo a través del
Proxy»; y RAG termina en «Proxy → Ollama / Providers». Lo medido:

| Pieza | Existe | Conectada al camino del pool |
|---|---|---|
| Upstream `claude-cli` en el proxy local | sí | sí |
| Reenvío HTTP genérico del proxy (`upstreamForwarder.ts`, `baseUrl`) | sí | no por `localProxy.ts` |
| Traductores Messages→OpenAI (`messagesToOpenAIRequest`, `translators/`) | sí | **0 consumidores** fuera de sus pruebas |
| Traductores OpenAI→Messages de entrada (`/v1/chat/completions`, `chatCompletions.ts`) | sí | sirven a un cliente OpenAI, no a un modelo abierto |
| Proveedor compatible con OpenAI (`openai/client.ts`: Ollama, vLLM por conexión del store) | sí | lo usa `@thyrox/agent: createDeps.ts`, **no** `thyrox -p` |
| Transporte de `thyrox -p` (`runLoop.ts::providerFor`) | `http` = `AnthropicHttpProvider` (formato Messages) o `recorded` | `--connection` sólo cambia `baseUrl` y clave: el formato sigue siendo Messages |
| Modelos que el pool puede elegir (`bin/agent-recommend`) | 19 del catálogo, **todos `claude-*`** | `--task-class` no puede derivar un modelo abierto |
| Servidor de modelo abierto en este contenedor | `ollama`, `llama-server`, `vllm`: ausentes; nada en `:11434` | — |
| GPU en este contenedor | ninguna: es una microVM Firecracker (`--firecracker-init` en el cmdline), 4 núcleos, 15 G de RAM, sólo dispositivos virtio; `hardware-inventory` da `none` con las ocho señales ausentes | aquí no hay GPU: los arneses de nivel 2 (`tests/session/hardware/test_gpu_admission_real.py`) y 3 (`test-gpu-pools-real.sh`) rehúsan con exit 2 («nvidia-smi no responde. No se midió nada») y `test-gpu-hardware-refusal.sh` da 12 de 12. Si la GPU del ejecutor, en otra máquina, se alcanza por red desde aquí es DESCONOCIDO: no existe un script que lo mida |

Conclusión medida: hoy un modelo abierto **no es alcanzable** desde el pool.
Las piezas de traducción existen, pero ninguna está conectada en el sentido
Messages → OpenAI dentro del proxy, que es el único camino que la ADR admite.

## Lo que falta, y quién lo decide

1. **Construible ya, sin Ollama:** un upstream del proxy para un endpoint
   compatible con OpenAI, que traduzca con los traductores existentes, se
   declare por conexión del store y se pruebe contra un servidor OpenAI
   falso en loopback. TASK-THYROX-0661.
2. **Decisión del ejecutor:** dónde corre Ollama y qué modelo. La GPU existe,
   pero en otro anfitrión: este contenedor es una microVM sin dispositivo de
   display. Si Ollama corre en la máquina con GPU, el proxy de este contenedor
   la alcanza como upstream remoto por su `base_url` (el proxy escucha sólo en
   loopback, pero reenvía a cualquier URL declarada), y eso exige que esa
   máquina sea alcanzable desde aquí por la política de red del entorno. Si
   corre aquí, sólo hay CPU y 24 G de disco libres. TASK-THYROX-0662.
3. **Tras 1 y 2:** que el catálogo y `agent-recommend` admitan un modelo
   abierto, para que `--task-class` pueda derivarlo. TASK-THYROX-0663.

*Metrica:* upstreams conectados, consumidores de cada traductor, transportes
de `thyrox -p`, universo del recomendador y servidores presentes.
*Ciega a:* la GPU del otro anfitrión, que no se ha medido: falta el script que pruebe si se alcanza por red; y si Ollama ofrecería un endpoint compatible con Messages, que haría
innecesaria la traducción; no hay Ollama aquí que medir.

## ¿Y si el instrumento de la GPU está equivocado?

Pregunta del ejecutor. Dos controles, los dos corridos el 2026-09-30:

- **Un instrumento independiente**, sin el script: `/sys/bus/pci/devices/*`
  leído a mano da once dispositivos, vendor `0x8086` (el host bridge) y
  `0x1af4` (virtio); ninguno `0x10de` (NVIDIA) ni de clase `0x03xxxx`
  (display). Coincide con `hardware-inventory`.
- **Un control positivo del script**: `tests/session/test-hardware-inventory.sh`
  (16 de 16) monta un `/sys` sintético con una tarjeta `0x10de` de clase
  `0x030200` y exige `nvidia-usable`, y la misma sin driver exige
  `partial`. El script sabe decir «sí»; su «no» aquí no es un cero ciego.

Lo que ninguno de los dos cubre: el árbol sintético es el modelo que el
autor tiene de un anfitrión con GPU, igual que el `nvidia-smi` falso. Que ese
modelo corresponda a una GPU real sólo lo prueban los niveles 2 y 3 sobre
hardware real, y aquí rehúsan por diseño. Y nada de esto mide una GPU en otra
máquina: TASK-THYROX-0666.

## Directiva del ejecutor sobre la GPU

«solo vendors Intel (0x8086) y virtio (0x1af4), está bien, no necesitamos
NVIDIA»; «NVIDIA puede utilizarse si se tiene, si no se usa lo que se tiene».

Consecuencias:
- TASK-THYROX-0666 (sondear una GPU en otra máquina) queda descartada.
- TASK-THYROX-0662 se acota: aquí Ollama corre en CPU. Siguen abiertos qué
  modelo abierto usar y si Ollama va en el anfitrión o como worker de Podman.
- El `PodmanWorkerManager` ya sigue ese criterio: la ruta de CPU está
  permitida siempre y la de CUDA sólo rehúsa, con exit 2, cuando se exige sin
  GPU.

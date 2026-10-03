# p7-podman-workers

## [313] TASK-THYROX-0556 — Arquitectura: Podman como frontera de ejecución de workers especializados (registro y dueño de servicios de larga vida)

Status on board: pending

Podman executes two kinds of containers with separate owners: managed infrastructure containers (PostgreSQL+pgvector, Redis) owned by InfrastructureBootstrap (TASK-THYROX-0606/0607), and specialized worker containers (semantic_search_worker, ...) owned by Daemon + PodmanWorkerManager. Podman provides execution/isolation for both; neither owner manages the other's containers. Consumers: SemanticSearchStore → PostgreSQL+pgvector; Proxy → SharedStateStore → Redis.

## [314] TASK-THYROX-0557 — PodmanWorkerManager bajo el daemon: crear, inspeccionar, detener y retirar contenedores de workers

Status on board: pending

Tras D7 (#275, tipos de worker), D9 (#278, IPC supervisor↔worker) y #312 (capacidades de aislamiento en la sonda). Usa thyrox_toolchain_require_podman, la admisión de VRAM existente (admitVram/releaseVram) y las banderas medidas (--network, --read-only, --cpus, --memory, --pids-limit, montaje :ro). Sin GPU aquí: la ruta CUDA rehúsa con exit 2 si se exige; CPU permitido. Vía pool.

## [326] TASK-THYROX-0605 — Measure Podman restart and healthcheck without systemd

Status on board: pending

Premise for declaring infrastructure as Podman services, measured on this VM (PID 1 process_api, systemd offline, cgroup v1, Podman 4.9.3): (a) does --restart=always/on-failure restart a container whose process is killed (conmon alive); (b) does anything bring it back after a VM restart (expected no: podman-restart.service needs systemd); (c) does --health-cmd run on its own or only via `podman healthcheck run` (4.x uses systemd timers). Workbench + results.tsv; each case with its control.

## [327] TASK-THYROX-0606 — Ensure infrastructure services are up at session start

Status on board: pending

On this VM no supervisor exists (PID 1 process_api, systemd offline), so after a VM restart PostgreSQL stays down until someone runs pg_ctlcluster (H-THYROX-276). Add an idempotent `infra ensure` step (bin/ wrapper) run at session start and as the daemon's preflight: detect each declared service (PostgreSQL today, Redis, later the Podman containers), start it if down, wait for health, and refuse with the named cause if it cannot. It does not own the service lifecycle beyond start-if-down; the backend (host cluster vs Podman) is a consumer parameter. Pairs with TASK-GEN-0639 (clear refusal in the test harness).

## [328] TASK-THYROX-0607 — Declare PostgreSQL+pgvector and Redis as Podman services

Status on board: pending

Design (after the restart/healthcheck measurement): infrastructure containers separate from PodmanWorkerManager's disposable workers. thyrox-postgres: pinned PostgreSQL 16 + pgvector 0.8.6 image, named durable volume, health command; thyrox-redis: ephemeral state, persistence only if its contract needs it. Ownership: infrastructure is started by the ensure step, never rebuilt by the daemon; semantic_search_worker stays under PodmanWorkerManager. Quadlet is excluded on this host (cgroup v1, no systemd). Include the data migration path from the host cluster and the disk budget (/ at 80%, 7.7G free).

## [315] TASK-THYROX-0558 — Semantic search worker y API (embeddings, retrieval pgvector, reranking) y consumidor RAG

Status on board: pending

Bloqueado por D5 (#203: qué vectorizar, modelo, dimensiones) y por PodmanWorkerManager. Hoy: 0 código de semantic search/RAG; el provider no tiene llamada de embeddings; torch no instalado; sin GPU. Primer corte a evaluar en D5: CPU con embeddings de Ollama (sin torch) + pgvector 0.6.0. El worker se conecta a PostgreSQL, no lo contiene. Redis no entra salvo necesidad concreta.

## [339] TASK-THYROX-0617 — Pass GPUs to workers through CDI when hardware exists

Status on board: pending

Derived from ADR-THYROX-007 Rule 2. The daemon applies policy (inventory, free VRAM, reservation in the existing ledger, GPU choice) and Podman receives the device by CDI (--device nvidia.com/gpu=...). Without GPU the CUDA path refuses with exit 2. Blocked on hardware: this host has no NVIDIA GPU (bin/hardware-inventory -> none); levels 2 and 3 of the GPU tests apply.

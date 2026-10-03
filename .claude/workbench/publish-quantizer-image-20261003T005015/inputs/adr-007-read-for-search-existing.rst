.. meta::
   :artefacto: ADR-THYROX-007
   :tipo: ADR
   :dominio: thyrox
   :estado: Aceptado
   :version: 1.2.0
   :fecha: 2026-09-29T10:15:50

.. _adr-thyrox-007:

=======================================================================================
ADR-007: Podman como frontera de los workers especializados, y Redis detrás de puertos
=======================================================================================

Estado
------

**ACEPTADO**: decisión del ejecutor, 2026-09-29. Enmienda dos puntos de
:ref:`adr-thyrox-006` (ver «Qué cambia de ADR-006»). Medido sobre
``thyrox@878b3376``. Tareas: **TASK-THYROX-0556** (este registro),
**TASK-THYROX-0557** (``PodmanWorkerManager``) y **TASK-THYROX-0558**
(``semantic_search`` y RAG). El store de la sesión se reconcilió el
2026-09-29 y las tres tarjetas recibieron su cita durable; el número de la
cita no se deriva del ordinal del board.

El acceso del worker a los datos lo precisa :ref:`adr-thyrox-008`: pasa por
``SemanticSearchStore``, un store de dominio sobre PostgreSQL + pgvector.

----

Contexto
--------

ADR-006 fijó tres niveles de persistencia y un proceso aparte sólo donde ya
hay frontera de proceso. Desde entonces aparecieron tres necesidades que esa
decisión no cubría:

- trabajo **especializado** —embeddings, reranking, inferencia con GPU— que
  pide aislamiento de recursos, dependencias pesadas (Torch, CUDA) y un ciclo
  de vida propio;
- **búsqueda semántica** y **RAG** sobre PostgreSQL + pgvector;
- usos de Redis **distintos** de la coordinación entre proxies: cachés de
  embeddings, de búsquedas y de reranking, y coordinación entre workers.

Lo medido en este anfitrión antes de decidir:

- **Podman 4.9.3** instalado con ``thyrox_toolchain_require_podman``
  (``thyrox@5b9d3c5d``), runtime ``runc``, cgroups v1, ``cgroupfs``.
- **Contención y límites efectivos** (``thyrox@23a75680``, sonda
  ``src/lib/podman_capabilities.sh``): el contenedor corre;
  ``--pids-limit 16`` deja 15 de 64 procesos; ``--memory 64m`` mata una
  reserva de 256 MiB (rc=137); tras ``rm -f`` no queda proceso.
- **Aislamiento efectivo** (``thyrox@322eb608``, fase 2b, cada bandera contra
  su control): ``--network none``, ``--read-only``, ``--cpus 0.5`` (0,50
  núcleos frente a 1,77 sin ella) y el repo montado ``:ro``.
- **Aquí no hay systemd**: PID 1 es ``process_api`` y ``systemctl`` responde
  ``offline``. Quadlet no aplica en este entorno.
- **Sin GPU NVIDIA** expuesta (``bin/hardware-inventory`` → ``none``).
- **El registro de VRAM ya existe**: ``ReservationLedger``
  (``thyrox: src/session/resource_admission.py:88``) y
  ``admitVram``/``releaseVram`` (``@thyrox/config: gpuAdmission.ts``).

Decisión
--------

**Regla 1: una responsabilidad por componente.**

.. list-table::
   :header-rows: 1

   * - Componente
     - Responsabilidad
   * - App-host
     - el runtime de la sesión: REPL y headless
   * - Proxy
     - enruta las llamadas de modelo (proveedores remotos y Ollama) y usa las
       credenciales
   * - Daemon
     - **decide**: ciclo de vida, supervisión, reinicio, backoff y admisión
       de recursos (VRAM con el registro existente)
   * - ``PodmanWorkerManager``
     - crea, inspecciona, detiene y retira los contenedores de workers, por
       orden del daemon
   * - Podman
     - **aísla y ejecuta**; no decide la planificación
   * - ``semantic_search``
     - la **capacidad**: embeddings, recuperación vectorial y reranking,
       devueltos como resultados ordenados
   * - ``semantic_search_worker``
     - el proceso que **calcula** esa capacidad, arrancado por el daemon
   * - Torch/CUDA
     - ejecución acelerada de los modelos especializados, **detalle interno**
       del worker
   * - Ollama
     - generación LLM local, alcanzada sólo a través del Proxy
   * - PostgreSQL + pgvector
     - **persiste y recupera** vectores: la verdad vectorial
   * - Redis
     - estado **compartido o temporal**, siempre detrás de un puerto (Regla 3)
   * - ``@thyrox/store``
     - persistencia estructurada general: SQLite por defecto, PostgreSQL
       cuando se declara

**Regla 1-bis: los componentes se nombran por su responsabilidad, no por su
tecnología.** La capacidad es ``semantic_search``; su proceso es el
``semantic_search_worker`` (en prosa, *semantic-search worker*). Torch y CUDA
son detalles internos de ese worker y no aparecen en ningún nombre. Se
descartan *ML worker* y *Data/Search*: el primero nombra una tecnología que
cualquier worker podría usar, el segundo mezcla la persistencia con el
cálculo. Es la cláusula de nombres de ``clean-code.md``: el nombre dice el
papel que ve el llamador, y cambiar el mecanismo (CPU en vez de CUDA, otro
modelo de embeddings) no cambia el papel.

**RAG es un consumidor de** ``semantic_search`` **, no parte de él.** La
búsqueda termina en resultados ordenados; esos resultados los consume una
búsqueda normal o el flujo RAG, que arma el contexto y llama al Proxy. La
generación nunca ocurre dentro del worker.

Vista de conjunto. El daemon **no** lanza el worker directamente: lo pide a
``PodmanWorkerManager``, que lo ejecuta en Podman (Regla 2).

.. code-block:: text

                             THYROX
                                │
                            App-host
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
            Proxy             Daemon        semantic_search
              │                 │                 │
     Providers / Ollama         │                 │
                                ▼                 │
                        PodmanWorkerManager       │
                                │                 │
                              Podman              │
                                │                 │
                     semantic_search_worker ◄─────┘
                                │
                     ┌──────────┼──────────┐
                     ▼          ▼          ▼
                Embeddings  Retrieval  Reranking
                     │          │          │
                Torch/CUDA      │     Torch/CUDA
                                │
                                ▼
                       SemanticSearchStore      (ADR-008)
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
              @thyrox/store          lógica vectorial
              infraestructura        pgvector
              PostgreSQL
                     └──────────┬──────────┘
                                ▼
                           PostgreSQL
                                │
                             pgvector

Tres precisiones que la vista no puede mostrar sola:

1. **Capacidad y proceso no son lo mismo.** ``semantic_search`` es la
   capacidad (la API que consumen la búsqueda normal y RAG);
   ``semantic_search_worker`` es el proceso especializado que implementa
   parte o todo su pipeline: embeddings, recuperación y reranking.
2. **El IPC es la frontera entre thyrox y el contenedor, no el enlace
   interno entre las tres etapas.** Dentro del worker, embeddings,
   recuperación y reranking son componentes normales del mismo servicio. El
   canal de control (IPC) y el acceso a datos son distintos: PostgreSQL no
   vive en el contenedor, y el worker se **conecta** a él para la etapa de
   recuperación.

   .. code-block:: text

      semantic_search
            │
           IPC
            │
            ▼
      ┌───────────────────────────────────┐
      │ contenedor Podman                 │
      │ semantic_search_worker            │
      │                                   │
      │   Embeddings                      │
      │       │                           │
      │   Retrieval ──► SemanticSearchStore ──► PostgreSQL
      │       │                           │     + pgvector
      │   Reranking por modelo            │
      └───────────────────────────────────┘

   El worker accede a los datos por ``SemanticSearchStore``
   (:ref:`adr-thyrox-008`), no por el store genérico; si esa pieza corre en
   el proceso del worker o aparte no lo decide este registro. El reranking
   matemático (distancia exacta sobre
   el embedding original) vive en el store; el reranking por modelo, en el
   worker.

3. **RAG consume resultados ordenados; no forma parte del worker.**

   .. code-block:: text

      pregunta → semantic_search → resultados ordenados
               → ensamblado de contexto → Proxy → Ollama / Providers
               → respuesta generada

Persistencia y estado compartido, con lo **decidido** separado de lo
**posible**:

.. code-block:: text

   Verdad persistente
   ────────────────────────
   @thyrox/store                  infraestructura común
   ├── SQLite (por defecto)
   └── PostgreSQL

   SemanticSearchStore            dominio vectorial (ADR-008)
   └── PostgreSQL + pgvector      OBLIGATORIO; no degrada a SQLite

   Estado compartido efímero — decidido e implementado
   ────────────────────────
   SharedStateStore
   └── Redis
       ├── leases del refresco de tokens
       ├── enfriamientos de credenciales
       └── ventanas de petición

Las capacidades propias de un motor (pgvector, FTS, Redis) no suben a
``@thyrox/store`` salvo que varios dominios necesiten el mismo contrato
(:ref:`adr-thyrox-008`, Regla 4).

Redis no participa hoy en la búsqueda semántica. Estas extensiones son
**posibles, no arquitectura realizada**; cada una entra sólo con una
necesidad medida y por su propio puerto (Regla 3):

.. code-block:: text

   Redis (extensiones posibles, no implementadas)
   ├── caché semántica
   ├── caché de embeddings
   ├── caché de reranking
   ├── leases de workers
   ├── heartbeats
   └── deduplicación de trabajos

**Regla 2: Podman es la frontera de ejecución de los workers especializados.**
El worker es un proceso con frontera propia: aislamiento, límites de CPU,
memoria y procesos, red declarada y montajes de sólo lectura. El worker **se
conecta** a PostgreSQL; no lo contiene. Un worker es desechable, reemplazable
y escalable; la base es durable y compartida, así que varios workers usan una
sola base sin duplicar datos.

Con GPU, el daemon aplica la política (inventario, VRAM libre, reserva en el
registro, elección de GPU) y Podman recibe el dispositivo por CDI
(``--device nvidia.com/gpu=…``). Sin GPU, el worker corre en CPU; la ruta CUDA
**rehúsa con exit 2** cuando se exige, igual que los arneses de hardware.

**Regla 2-bis: la ejecución por Podman tiene dos perfiles, y el userspace
reproducible es lo que los separa.** Es una decisión de implementación dentro
de ``PodmanWorkerManager``, no una redefinición de la arquitectura: la cadena
sigue siendo Daemon → ``PodmanWorkerManager`` → Podman → worker, y las
responsabilidades no se mueven.

.. code-block:: text

   Podman execution
   ├─ repository/job workers   (headless-pool, pruebas, trabajos sobre el repo)
   │    ├─ repo:/w:O           overlay temporal: el trabajo no copia el árbol
   │    └─ --rootfs /:O        herramientas del anfitrión; se EVALÚA como
   │                           optimización, no es la forma por defecto
   │
   └─ specialized workers      (semantic_search_worker)
        └─ imagen versionada y reproducible: Python/Torch/CUDA/modelos

La diferencia no es de rendimiento sino de propiedad: con ``--rootfs /:O`` el
worker **deja de tener un userspace reproducible definido por una imagen**;
corre con lo que el anfitrión tenga instalado ese día. Eso puede ser aceptable
para un trabajo sobre el repositorio, cuyo contrato ya es «el toolchain de
este anfitrión», y no lo es para un worker especializado, cuya salida depende
de versiones exactas de bibliotecas y modelos.

.. list-table::
   :header-rows: 1

   * - Responsable
     - Qué hace
   * - Daemon
     - scheduling, admisión de VRAM, ciclo de vida, límites de recursos
   * - Podman
     - aislamiento de filesystem y de procesos, exposición de dispositivos,
       entorno de ejecución

**Y el artefacto que la imagen contiene tiene que ser autosuficiente.**
Versionar Python, Torch, CUDA y los modelos no basta si el código de Thyrox
que la imagen ejecuta desde ``dist/`` depende de un archivo que el build dejó
fuera. Es la capa de artefacto, debajo de la de componentes:

.. code-block:: text

   source → build → dist + runtime assets → imagen del worker

La regla: **todo archivo que el código ejecutado desde** ``dist/`` **espera
encontrar físicamente es producido por el pipeline de compilación o
preservado explícitamente como recurso runtime; si no es ninguna de las dos,
el build es inválido.** Se decide por lo que el runtime espera, no por la
extensión ni por cuándo se usa: ``bridge.py`` es código, sólo corre en
Windows, y aun así es un recurso runtime porque el pipeline TypeScript no lo
produce y el ``.js`` construido lo resuelve junto a sí. Lo mismo vale para
prompts, ``.jsonl``, ``.wasm``, SQL, plantillas, esquemas o certificados.

Y «junto a sí» es donde quedó el ``.js`` que lo lee, no la posición espejo del
fuente: con ``splitting`` ese código vive en un chunk de la raíz de ``dist/``
(H-THYROX-264). El control de este requisito ejecuta desde ``dist/``, porque
en el perfil de repositorio el árbol ``src/`` montado oculta un recurso que
falta, y en el especializado ``src/`` puede no existir. Se cierra en
H-THYROX-263.

PostgreSQL y Redis no cambian por esto: el ``semantic_search_worker`` sigue
conectándose a PostgreSQL + pgvector, y a Redis sólo por un puerto concreto
cuando aparezca la necesidad (Regla 3).

Lo medido en este anfitrión (Podman con driver ``overlay``, rootful, cgroup
v1; banco ``thyrox: .claude/workbench/podman-overlay-probe-*``):

- ``--rootfs /:O`` arranca con bun 1.3.11, Python 3.11 y git 2.43 del
  anfitrión, en menos de un segundo y sin construir imagen;
- con ``-v <repo>:/w:O`` lo que el contenedor escribe en ``/w`` no aparece en
  el árbol del anfitrión;
- un ``bun install`` dentro de esa capa (870 MB de ``node_modules`` sobre un
  árbol de 4.3 GB) deja **0 MB netos** de disco al retirar el contenedor.
  Hoy cada ítem de ``headless-pool`` con ``--isolation worktree`` ocupa entre
  1.9 y 2.6 GB, y un worktree huérfano de un pool detenido ocupaba 1.8 GB.

Así, el perfil de repositorio responde a la vez a tres deudas del pool: el
espacio de un worktree por ítem, las dependencias del ítem (#303, H-THYROX-261)
y que ningún proceso del ítem sobreviva al ítem, porque retirar el
contenedor retira su árbol de procesos. Lo que el ítem necesita del
anfitrión —la red hacia el proveedor y la credencial— se declara en el
perfil, no se hereda en silencio.

**Regla 3: Redis crece sólo detrás de puertos con una responsabilidad
declarada.** Redis es un detalle de implementación. Cada uso entra por un
puerto propio, con una de estas responsabilidades: **caché, coordinación,
lease, cola o eventos**. No existe un ``RedisStore`` genérico ni se «guardan
cosas en Redis».

El criterio de cada dato es una pregunta:

.. list-table::
   :header-rows: 1

   * - ¿El dato es…?
     - Va a
     - Ejemplos
   * - verdad durable: debe sobrevivir a un ``FLUSH``, un reinicio, un
       desalojo o un TTL
     - PostgreSQL o SQLite, **nunca** Redis
     - tareas, hallazgos, errores, credenciales, claves de sesión, historia de
       migraciones, embeddings persistentes
   * - estado compartido o temporal, derivable o reconstruible
     - Redis, por su puerto
     - leases, rate limits, cuotas, enfriamientos, cachés, heartbeats

Puertos previstos:

.. list-table::
   :header-rows: 1

   * - Puerto
     - Responsabilidad
     - Estado
   * - ``SharedStateStore``
     - coordinación entre proxies: leases del refresco, ventanas, cuotas,
       enfriamientos
     - existe (R1–R4); falta el cableado R5 (#268)
   * - ``SemanticCache``
     - caché de embeddings (clave: modelo + hash del contenido), de búsquedas
       (modelo + hash de la consulta + versión del corpus) y de scores de
       reranking (modelo + consulta + candidato + hash del candidato); con
       TTL; el vector persistente sigue en PostgreSQL
     - por construir, con #315
   * - ``WorkerCoordination``
     - leases, heartbeats y deduplicación de trabajos caros (``SET … NX PX``)
       entre workers
     - **sólo si** el daemon decide delegar parte de su roster; no por
       defecto, porque el daemon ya lleva el suyo

**Colas y eventos** (Redis Streams, Pub/Sub) no se introducen sin una
necesidad medida, y antes hay que responder si reemplazan una función del
daemon o del spool, o serían una segunda cola paralela. No se admite daemon
spool y cola de Redis para el mismo trabajo sin un dueño claro.

**Regla 4: la infraestructura durable y los workers tienen dueños distintos.**
Decidido por el ejecutor el 2026-09-29 (enmienda 1.2.0). Podman ejecuta dos
clases de contenedor, y ninguno de los dos dueños gestiona los del otro:

.. code-block:: text

   Podman
   ├─ contenedores de infraestructura gestionada   dueño: InfrastructureBootstrap
   │   ├─ thyrox-postgres   PostgreSQL + pgvector, volumen durable
   │   └─ thyrox-redis      Redis
   │
   └─ contenedores de workers especializados        dueño: Daemon + PodmanWorkerManager
       └─ semantic_search_worker, …

No se llaman *servicios*: sin systemd no hay gestor de servicios que los
supervise (PID 1 es ``process_api``, cgroup v1). **Ninguno vuelve solo tras
reiniciar la microVM**: ``--restart=always`` cubre la salida del proceso del
contenedor, no el arranque de una VM nueva. Por eso el dueño es un
``InfrastructureBootstrap`` que corre al iniciar la sesión (y como preflight
del daemon) y asegura el estado esperado de forma idempotente:

.. code-block:: text

   cargar la declaración (TASK-THYROX-0607)
     → inspeccionar el contenedor
     → validar el proceso real: estado reportado + PID vivo
     → ausente o stale (Podman dice running y el PID murió) → rm -f + recrear
     → arrancar
     → correr el health check explícitamente, repetido hasta sano o hasta el plazo
     → declararlo listo; si no, fallar el arranque con causa y diagnóstico

La decisión de conservar o recrear nunca sale sólo del estado reportado:

.. code-block:: text

   NO:  estado reportado == running                         → conservar
   SÍ:  estado reportado + PID vivo + health check explícito → conservar / recrear

**El contenedor es descartable, también el de PostgreSQL.** La verdad durable
vive en el volumen, no en el contenedor, así que recrearlo no toca los datos.
Redis conserva su semántica de estado compartido efímero (Regla 3): su volumen,
si lo tiene, no es fuente de verdad salvo una decisión específica.

Dos hechos medidos lo fijan (``thyrox: .claude/workbench/podman-recovery-without-systemd-20260929T160414/``,
TASK-THYROX-0605):

- **El health check no corre solo aquí**: 0 ejecuciones en 10 s, porque Podman
  lo programa con temporizadores de systemd. ``--health-on-failure=restart``
  sólo actúa tras un ``podman healthcheck run`` explícito, así que el
  bootstrap lo dispara.
- **El estado de Podman no es evidencia de vida**: muerto el árbol de procesos,
  Podman sigue diciendo ``running`` y ``podman start`` sale 0 sin arrancar
  nada. La vida se mide sobre el PID; la recuperación es ``rm -f`` + recrear,
  y el volumen conserva los datos.

Qué está medido y qué no:

.. list-table::
   :header-rows: 1

   * - Escenario
     - Estado
   * - caída del proceso del contenedor
     - **medido**: ``--restart=on-failure``/``always`` lo recuperan (1 reinicio, PID nuevo)
   * - árbol de procesos muerto con estado de Podman stale
     - **medido**: sólo ``rm -f`` + recrear lo devuelve; el volumen conserva los datos
   * - reinicio completo de la microVM
     - **no medido**: no se puede provocar desde dentro de una sesión, y además vacía ``/run``

El bootstrap registra en cada arranque qué encontró (definido, estado reportado,
PID vivo, acción). El primer arranque tras un reinicio real convierte la
tercera fila en evidencia.

Tareas y contrato
-----------------

**TASK-THYROX-0556 es esta decisión y su contrato, no una implementación.** No
se despacha como ítem de pool: un ítem que implementa una parte no decide
arquitectura. Lo que materializa la decisión son tareas separadas,
verificables y aptas para pool cuando son independientes:

.. list-table::
   :header-rows: 1

   * - Tarea
     - Qué materializa
     - Estado
   * - TASK-THYROX-0605
     - recuperación y health check sin systemd, medidos
     - hecha
   * - TASK-THYROX-0607
     - declaración de ``thyrox-postgres`` y ``thyrox-redis``: nombres, imágenes versionadas, red, volúmenes, health checks, puertos, contrato crear/arrancar/inspeccionar
     - pendiente
   * - TASK-THYROX-0606
     - ``InfrastructureBootstrap`` idempotente
     - pendiente; tras 0607
   * - TASK-THYROX-0557
     - ``PodmanWorkerManager``
     - pendiente
   * - TASK-THYROX-0613
     - perfil de repositorio/trabajo (Regla 2-bis)
     - pendiente
   * - TASK-THYROX-0614
     - perfil especializado con imagen versionada (Regla 2-bis)
     - pendiente
   * - TASK-THYROX-0615
     - límites de CPU, memoria, procesos, red y filesystem por perfil declarado
     - pendiente
   * - TASK-THYROX-0616
     - ciclo de vida y limpieza de contenedores de workers
     - pendiente
   * - TASK-THYROX-0617
     - GPU por CDI
     - bloqueada: no hay GPU NVIDIA en este anfitrión
   * - TASK-THYROX-0558
     - ``semantic_search`` y RAG
     - bloqueada por D5

Qué cambia de ADR-006
---------------------

- ADR-006, Regla 1, decía *«No hay servidor de storage, de datos ni de
  RAG»*. Se enmienda: **el worker especializado es una frontera de proceso
  nueva**, justificada por aislamiento, recursos y dependencias. Sigue sin
  haber servidor de storage propio: la persistencia es PostgreSQL o SQLite.
- ADR-006 decía que otro consumidor de estado efímero *«entraría por el mismo
  puerto»* (``SharedStateStore``). Se precisa: entra por **un puerto con su
  propia responsabilidad** (Regla 3). ``SharedStateStore`` sigue siendo el de
  la coordinación entre proxies.

Consecuencias
-------------

- ``PodmanWorkerManager`` (#314) espera a los tipos de worker (D7, #275), al
  IPC supervisor↔worker (D9, #278) y a las capacidades de aislamiento en la
  sonda (#312).
- Semantic search y RAG (#315) esperan a D5 (#203): qué se vectoriza, con qué
  modelo y con qué dimensiones. El primer corte a evaluar ahí es CPU, con
  embeddings de Ollama (sin Torch) y pgvector 0.6.0.
- **PostgreSQL en un contenedor de Podman** es una cuarta opción para
  pgvector 0.8 en D2b (#200): la imagen la trae sin tocar el PostgreSQL de
  Ubuntu (H-THYROX-256). Sigue siendo un cambio de servidor, aislado; se
  decide con D2b, tras D5.
- El registro de VRAM se reusa; no se construye un segundo.

Qué no decide
-------------


- el modelo de embeddings, las dimensiones y la versión de pgvector (D5, D2b);
- si Redis entra en el plano de control del daemon (``WorkerCoordination``);
- colas o eventos;
- si ``--rootfs /:O`` pasa a ser la forma del perfil de repositorio o queda
  como optimización evaluada: gana userspace sin imagen y pierde
  reproducibilidad, y esa elección es del ejecutor (Regla 2-bis). No se
  vuelve el defecto hasta medir también lo que el pool necesita de él:
  aislamiento, dependencias, limpieza, señales y código de salida, y la
  conducta ante fallos. Nunca es el perfil del ``semantic_search_worker``.

*Métrica:* las sondas de ``thyrox@23a75680`` y ``thyrox@322eb608``, cada
bandera contra su control; PID 1 y ``systemctl``; ``git grep`` sobre
``thyrox@878b3376``.
*Ciega a:* GPU real y CDI (no hay NVIDIA aquí); Podman sin uid 0; DNS e IPv6
con ``--network none``; la carga real de un ``semantic_search_worker``, que
todavía no existe.

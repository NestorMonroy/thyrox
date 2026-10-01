# packaging-install-inventory

## El encargo

> «considero que el P11 va a tener varios cambios en un futuro, porque el
> Empaquetado también tiene que considerar lo de SemanticSearchStore sobre
> PostgreSQL + pgvector, lo de redis y casi todo el flujo de thyrox» —
> ejecutor, 2026-09-30.

## La premisa, si se corrigio al primer comando

La serie Empaquetado nació comparando thyrox con el **ejecutable** de la
referencia (`packaging-reference-analysis-20260928T054658`, §4): P0–P7 son
los mecanismos de un binario único. La referencia no tiene servicios que
empaquetar; thyrox sí. P8–P11 aparecieron después, por episodios, y ninguna
fase cubre la infraestructura. Y la serie no tiene documento de gobierno en
kaupamex-docs: vive sólo en el store y en ese banco.

## El inventario, derivado del código (`outputs/inventory.out`)

| Eje | Qué hay hoy |
|---|---|
| herramientas del toolchain (`thyrox_toolchain_require_*`) | 17: bun, podman, pgvector, redis, parallel, gawk, gnu_time, postgres_test_db, githooks, … |
| contenedores de infraestructura declarados | 2: `postgres`, `redis` (Ollama pendiente, TASK-THYROX-0662) |
| conexión a servicios | PostgreSQL (`THYROX_*_DATABASE_URL`, `THYROX_TEST_POSTGRES_URL`, `THYROX_INFRA_POSTGRES_*`), Redis (`THYROX_REDIS_URL`, `THYROX_PROXY_MODE`), upstream OpenAI (`THYROX_OPENAI_COMPAT_*`) |
| procesos de larga vida lanzados desde `bin/` | `infrastructure_ensure`, `provider-local-proxy`, dos proxies de credencial, el mock |
| lo que hace `install.sh` | declara `THYROX_ROOT`, prepara el clon, crea los hogares (P11), mide el contrato |

## La serie en capas (propuesta)

| Capa | Qué cubre | Fases |
|---|---|---|
| 1 · ejecutable | lo que se compila y lo que lleva dentro | P0–P7 |
| 2 · clon e instalación | githooks, `.env` que gobierna, hogares | P8, P10, P11 |
| 3 · infraestructura gestionada | PostgreSQL + pgvector (persistente, puede ser externo), Redis (compartido/efímero), Ollama (inferencia de larga vida), Podman como runtime; su dueño es el bootstrap de infraestructura (ADR-007 Regla 4, ADR-008 §Ámbito de vida) | **P12, TASK-THYROX-0676** |
| 4 · servicios de thyrox | daemon, proxy local, fuentes de credencial, pool | **P13, TASK-THYROX-0677** |

### La capa 3 en concreto, con lo que ya está medido

| Servicio | Tarea | Lo que la instalación tiene que llevar |
|---|---|---|
| PostgreSQL + pgvector | TASK-THYROX-0562 (store), ADR-008 | una URL (`THYROX_SEMANTIC_SEARCH_DATABASE_URL`), la extensión habilitada por la infraestructura (el store sólo la verifica: tres estados), migraciones propias del store |
| Redis | ADR-006 (modo `single`/varios proxies) | `THYROX_REDIS_URL` y `THYROX_PROXY_MODE`; contenedor `redis` ya declarado |
| **Ollama** | **TASK-THYROX-0662** (Run Ollama as managed inference infrastructure) | imagen `docker.io/ollama/ollama:0.35.0` (5.5 GB, 89 s medidos); `--network host` con `OLLAMA_HOST` en loopback y la CA del proxy montada (medido: la red propia de Podman no alcanza el proxy); el modelo elegido por el benchmark CPU; la admisión de disco antes de bajar imagen y modelo (TASK-THYROX-0671); NVIDIA opcional por diseño; hoy **no está declarado** en `infrastructure.sh` |
| Podman | ADR-007 | el runtime de los tres anteriores; `thyrox_toolchain_require_podman` |

Límite operativo común (ADR-007): el entorno es efímero, así que cada
reciclado recupera imágenes y modelos (5.5 GB de Ollama más su modelo); el
techo de disco lo da la admisión de 0671, no el tamaño nominal del disco.

**Qué NO decide este análisis** (es del ejecutor): si la instalación en
producción *provisiona* la infraestructura o sólo *verifica* una ya dada
(URL externa), y cómo se distribuye la credencial de PostgreSQL. ADR-008 ya
fija que PostgreSQL puede ser externo y persistente; la instalación de un
entorno de desarrollo usa el bootstrap local como infraestructura de prueba.

**P11 queda como la capa 2 y crecerá con la 3:** los hogares son hoy
directorios del clon; cuando la capa 3 exista, la instalación también
declarará y verificará los servicios que esos hogares acompañan.

*Metrica:* funciones `thyrox_toolchain_require_*`, contenedores de
`infrastructure.sh`, claves de `.env.example` y nombres de `bin/`.
*Ciega a:* servicios que se arrancan sin envoltorio con nombre de servicio
(p. ej. el daemon, que se lanza por `bin/cli`), y dependencias de un
consumidor (kaupamex-*).

La serie no tiene documento de gobierno en kaupamex-docs; escribirlo, con las
cuatro capas y la decisión que espera cada una, es **TASK-THYROX-0678**.

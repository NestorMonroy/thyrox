# semantic-search-store

## El encargo

> «La pregunta te está pidiendo definir el ámbito de vida y operación de
> PostgreSQL, no sólo dónde levantarlo hoy [...] 1. Implementa ahora la parte
> local y el puerto de `SemanticSearchStore`. 2. Permite configurar PostgreSQL
> mediante URL/configuración, sin codificar que vive en este contenedor. 3.
> Usa el cluster local actual para pruebas de integración. 4. No acoples
> migrations, datos ni lifecycle al contenedor del worker. 5. Deja preparada
> la misma interfaz para apuntar después a una máquina persistente o a un
> servicio gestionado sin cambiar el dominio.» — ejecutor, 2026-09-30, sobre
> `postgresql-readiness-20260930T193448`.

## La decisión de arquitectura (del ejecutor)

```
Podman workers → efímeros
PostgreSQL     → persistente   (servicio compartido, fuera del lifecycle de los workers)
Redis          → compartido/efímero
```

- PostgreSQL + pgvector es infraestructura gestionada de thyrox, como Redis,
  con otra responsabilidad: persistencia durable compartida y búsqueda
  vectorial. Su dueño es el bootstrap de infraestructura, no el
  `semantic_search_worker` ni el `PodmanWorkerManager`.
- En producción puede vivir en una máquina persistente o en un servicio
  gestionado; el dominio no elige entre los dos: los dos caben detrás de la
  misma URL.
- El PostgreSQL de este contenedor es **development/test infrastructure**, no
  la ubicación del PostgreSQL común.

## La premisa, si se corrigio al primer comando

El análisis de readiness decía «cluster instalado, parado». Arrancado aquí
como infraestructura de prueba; lo que cambia el contrato es otra medición:

| Medición | Valor | Consecuencia para el contrato |
|---|---|---|
| pgvector disponible | 0.8.6 (`vector.control`) | cubre `binary_quantize` y `bit_hamming_ops` de ADR-008 |
| ¿extensión confiable? | **no** (`trusted = f`) | el rol de aplicación no puede crearla: «Must be superuser» |
| en la base de pruebas | 0.8.6, creada por el administrador del clúster | la habilita la infraestructura, no el store |

**Por tanto el store no crea la extensión.** `migrateVectorSchema` comprueba
que `vector` exista en la versión mínima y, si falta, rehúsa nombrando el paso
del administrador. Es la misma forma que en un servicio gestionado, donde la
extensión la habilita quien administra la instancia. Sus tablas e índices sí
los migra el store, con el rol de aplicación.

## Lo que se construye (TASK-THYROX-0562)

`SemanticSearchStore` en su propio paquete, con la superficie de ADR-008
(`upsertEmbedding`, `searchNearest`, `searchBinaryCandidates`, `getEmbedding`,
`migrateVectorSchema`), configurado por URL, sin ninguna ruta ni supuesto de
este contenedor; la dimensión es un parámetro del esquema (D5 no está
decidido); rehúsa sin PostgreSQL + pgvector; pruebas de integración contra
`THYROX_TEST_POSTGRES_URL` sobre el clúster local.

*Metrica:* `pg_lsclusters`, `vector.control`, `pg_available_extension_versions`
y `pg_extension` de la base de pruebas, una vez.
*Ciega a:* el comportamiento en un servicio gestionado concreto (qué
versiones de pgvector ofrece y quién la habilita), que se mide cuando exista.

# ¿Hay un registry OCI local gestionado? (P5c, TASK-THYROX-0754)

## El encargo

<!-- verbatim, sin parafrasear -->

> ```
> Docker Hub no es obligatorio
> registry OCI sí lo es con el flujo actual
> ```
>
> Pero todavía quiero responder una pregunta:
>
> ```
> ¿puede Thyrox declarar un registry OCI LOCAL
> como infraestructura gestionada
> reutilizando sus primitivas actuales?
> ```
>
> Haz una búsqueda read-only primero por:
>
> ```
> registry
> oci registry
> distribution
> registry:2
> managed infrastructure
> image-registry
> registry credentials
> localhost registry
> ```
>
> No implementes nada todavía si ya existe.
> Clasifica el resultado:
>
> ```
> A. ya existe registry local gestionado
> B. existe mecanismo parcial reutilizable
> C. no existe
> ```
>
> Si A:
> úsalo y P6 ya no requiere credencial externa.
> Si B:
> dime exactamente qué falta.
> Si C:
> registra la alternativa arquitectónica:

## La premisa, si se corrigio al primer comando

Ninguna: el encargo se ejecutó tal como se pidió.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/p5c/README.md` | ¿Hay un registry OCI local gestionado? (P5c, TASK-THYROX-0754) |

## Los resultados

Búsqueda de sólo lectura (2026-10-02) por registry, OCI, distribution,
`registry:2`, infraestructura gestionada, image-registry, credenciales y
localhost. Clasificación: **B — mecanismo parcial reutilizable.**

## Lo que existe

- `@thyrox/artifact-registry: ociArtifactRegistry.ts` — adapter genérico del
  protocolo de distribución OCI; su cabecera nombra «un `registry:2` local»
  como destino válido por URL y credencial.
- Infraestructura gestionada (`src/lib/infrastructure.sh`,
  `infrastructure_ensure`): ciclo de vida, salud, volumen, disco y secretos de
  un conjunto cerrado de servicios.

## Lo que falta para un registry local gestionado

1. La infraestructura declara sólo `thyrox-postgres`, `thyrox-redis` y
   `thyrox-ollama`: no hay servicio de registry.
2. `publishCommand.ts::registryBaseUrl` fuerza `https://` para todo registry
   que no sea Docker Hub: un `registry:2` en loopback por HTTP no es alcanzable.
3. `resolvePublisherCredential` exige usuario y token, mientras el verificador
   y `ensure` leen de forma anónima. Un `registry:2` con htpasswd exige
   autenticación también para leer: es una decisión de diseño, no un ajuste.
4. Política vigente: `THYROX_REGISTRY_PUBLISHER_REGISTRY` vacía significa
   `docker.io` (`registryCredential.ts:26`, `DEFAULT_REGISTRY`). Ningún
   consumidor declara otra.

## Alternativas para P6

| | P6a — registry OCI externo | P6b — registry OCI local gestionado |
|---|---|---|
| Qué pide | endpoint declarado explícitamente + identidad/token de publicador | nueva capacidad de thyrox: servicio de infraestructura, HTTP en loopback o TLS local, modelo de credencial de lectura |
| Disco | ninguna copia más en el anfitrión | una copia física más del GGUF en el almacén del registry (4.68 GB con Qwen) |
| Lo que prueba | la publicación tal como la ve un consumidor externo | publicación local; no prueba alcance externo |

Disco del flujo actual (Qwen 7B, sin cambios): pico 10.64 GB en la fusión,
margen 0.27 GB, se necesitan ~10.9 GB. Recuperable aquí: 9.81 GB medidos antes
de construir `localhost/ai-course-notes-runner:dev` (1.03 GB, ~650 MB propios);
con esa imagen presente, unos 9.2 GB.

*Metrica:* piezas encontradas por término y clasificación A/B/C.
*Ciega a:* mecanismos con otro vocabulario: una búsqueda léxica no ve un sinónimo que no se buscó.

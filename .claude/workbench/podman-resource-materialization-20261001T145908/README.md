# podman-resource-materialization

## El encargo

> «Generaliza la primitiva … `podman-execution-primitive` es la vía obligatoria
> de ejecución/materialización Podman» — directiva del ejecutor 2026-10-01
> (TASK-THYROX-0738..0742).

## La premisa, si se corrigio al primer comando

La infraestructura se creaba con argv de `podman` compuesto en
`src/lib/infrastructure.sh` y ejecutado por `bin/infrastructure_ensure`, y la
contraseña de PostgreSQL viajaba como `-e POSTGRES_PASSWORD=…`.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/podman_secret_semantics.sh` | mide `podman secret` en 4.9.3 sin contenedores: stdin, etiqueta, inspect, `--replace` |
| `outputs/podman_secret_semantics.txt` | su salida |
| `probes/annul_resource_materialization.sh` | anula ownership, redacción y deriva de volumen, una por una, y restaura |

## Los resultados

- `podman secret inspect` no contiene el valor (0 ocurrencias); admite
  etiquetas y `--replace`; un secreto ausente sale 125.
- Suite de `ensureResource`: 23/23. Anulaciones: ownership tumba 3 (los tres
  de ownership), redacción 1, deriva de volumen 1; restaurado, 23/23.

*Metrica:* casos de `__tests__/resourceMaterialization.test.ts` contra el doble
con estado `testing/fakePodmanHost.ts`.
*Ciega a:* la forma real del JSON de `podman container inspect` y la ruta real
del secreto montado: las mide la suite contra Podman de verdad.

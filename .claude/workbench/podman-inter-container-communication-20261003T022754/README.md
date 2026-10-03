# podman-inter-container-communication

## El encargo

«analiza la documentación de podman y considera implementar lo necesario para
la comunicación entre imágenes» (ejecutor, 2026-10-03). Fuente:
`podman-main-docs.7z` extraído en `_references/podman-docs/` (606 archivos, rama main; ver su `PROVENANCE.md`).

## Lo que dice la documentación (citado)

| Hecho | Fuente |
|---|---|
| `--network host` da acceso completo a sockets Unix abstractos y a TCP/UDP en loopback del anfitrión; «may be considered a security vulnerability» | `_references/podman-docs/docs/source/markdown/options/network.md` (modo `host`) |
| La red por defecto `podman` (netavark) **no** resuelve DNS; una red creada por el usuario sí | `_references/podman-docs/docs/tutorials/basic_networking.md:101` |
| `--network-alias`: nombre resoluble en las redes con DNS | `_references/podman-docs/docs/source/markdown/options/network-alias.md` |
| `--internal`: restringe el acceso externo de una red `bridge`; con CNI apaga el DNS | `_references/podman-docs/docs/source/markdown/options/internal.md` |
| `--disable-dns`: el DNS contenedor↔contenedor sólo existe con el driver `bridge` | `_references/podman-docs/docs/source/markdown/options/disable-dns.md` |
| Un pod comparte el espacio de red: sus contenedores se hablan por `localhost` | `_references/podman-docs/docs/tutorials/basic_networking.md:304-306` |

## Este anfitrión (MEDIDO)

- Podman 4.9.3, rootful, backend **netavark** con `aardvark-dns`
  (`/usr/lib/podman/{netavark,aardvark-dns}`): DNS y `--internal` disponibles a la vez.
- `thyrox-infra`: `bridge`, `dns_enabled: true`, `internal: false`, 10.89.0.0/24
  (`/etc/containers/networks/thyrox-infra.json`).
- `thyrox-postgres` y `thyrox-redis`: estado `created` (no corren tras el
  reinicio); `thyrox-ollama`: `running` en red del anfitrión.

## Search Existing

| Pieza | Autoridad | Decisión |
|---|---|---|
| Red con nombre para infraestructura | `podman-execution/resourceMaterialization.ts:42,271,385-388` (`ResourceNetwork` `named`, `ensureNetwork` → `network create`); `src/lib/infrastructure.sh:85-113,217-234` (postgres y redis en `thyrox-infra`) | **REUSE** |
| Ollama en red del anfitrión | decisión medida en `infrastructure.sh:106-113` (el pull por la red de Podman era lento) | se conserva |
| Red de un worker | `workerResourceProfile.ts:21,62` (`none | bridge | host`); CLI `run`: `none | host` (`executionCommand.ts:123-125`) | **EXTEND**: falta un modo de red con nombre e interna |
| Observación de redes | `podman-execution-execute observe` no lista redes (`containers, images, storage, volumes`) | **EXTEND** (lectura) |
| Tarea o hallazgo previo | ninguno (store de tareas y hallazgos) | nueva tarea |

## Diseño propuesto (no implementado)

```
worker unit ──(red interna thyrox-models-<grant>, DNS)──> model unit (alias del grant)
      └─ sin --network host: no ve postgres, redis ni el loopback del anfitrión
```

- `WorkerNetworkMode` gana `{ mode: 'named', name, internal: true }`, el mismo
  `ResourceNetwork` que la infraestructura: una autoridad de red, no dos.
- La red la crea la primitiva (`ensureNetwork` con `--internal`), con etiqueta de
  dueño; la retira al soltar el grant.
- El proxy local deja de alcanzar la unidad por `127.0.0.1:<puerto>` y la
  resuelve por su alias en la red interna.
- Antes del código: enmienda de ADR-007 (red de workers), porque cambia la
  regla «red declarada por perfil».

## Estado

Rama registrada como TASK-THYROX-0913, no bloqueante: la ruta P0 (canario 0665) funciona en red del
anfitrión una vez haya disco (H-THYROX-431). La implementación va por un
trabajador gestionado, no por el controlador.

*Métrica:* lectura de la documentación citada y del código; archivos del anfitrión.
*Ciega a:* el comportamiento real de `--internal` + DNS aquí (no se ejecutó: la
primitiva aún no crea contenedores en una red con nombre fuera de la infraestructura).

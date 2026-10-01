# Fuente de verdad — colisión de locks de Podman tras un reinicio (TASK-THYROX-0695)

Tarjeta: «Detect Podman lock collisions after a container restart and report
the remedy». Hallazgo que la origina: H-THYROX-296
(`kaupamex-docs: source/gestion/pm/thyrox/iniciativas/implementar-ciclo-de-vida-del-pool-thyrox/hallazgos/hallazgo-H-THYROX-296-colision-de-locks-de-podman-tras-reinicio.rst`).

## El fenómeno, medido

Podman guarda en su base de datos el número de lock de cada objeto y los
locks en memoria compartida. Reiniciar el contenedor de la sesión borra la
memoria compartida y conserva la base: un objeto nuevo puede recibir el número
de uno anterior. Medido el 2026-09-30: el contenedor `thyrox-ollama-bench` y el
volumen `thyrox-ollama-bench-models` compartieron el lock 3; `podman run` salió
126 y `podman start` escribió el literal `deadlock due to lock mismatch`
(presente en el binario 4.9.3: `outputs/podman-4.9.3-lock-literals.txt`). El
remedio que Podman nombra es `podman system renumber`, que exige que no corra
ningún otro proceso de Podman; retirar el objeto anterior en conflicto también
lo resolvió.

## Qué se construye

Hoy los dos llamadores publican el stderr crudo o un fallo genérico. Tienen que
**reconocer** el error por su literal, **nombrar** el objeto afectado y **el
remedio**, y no reintentar en silencio. Nunca ejecutan `podman system
renumber` por su cuenta: exige que no corra otro proceso de Podman y afectaría
a los workers vivos; lo decide el operador.

1. **Primitiva (TypeScript)** — `src/packages/podman-execution/`:
   - `podmanLockCollision.ts` (nuevo): `isLockCollision(stderr: string):
     boolean` por el literal exacto (constante con nombre, citando la versión
     medida), y `lockCollisionRemedy(subject: string): string` con el texto del
     remedio (retirar el objeto anterior que comparte el lock, o `podman system
     renumber` con Podman parado).
   - `containerRun.ts`: `ContainerRunError` gana `readonly lockCollision:
     boolean` y, cuando es verdadero, su mensaje añade el remedio. Ninguna otra
     conducta cambia.
   - Pruebas en `src/packages/podman-execution/__tests__/` con un
     `PodmanExecutor` falso que devuelve exit 126 y el literal en `create` y en
     `start`; un stderr distinto no se clasifica como colisión.
2. **Infraestructura (shell)** — `src/lib/infrastructure.sh` y
   `src/session/infrastructure_ensure.sh`: cuando `podman create`/`start` de un
   contenedor gestionado falla con el literal, el ensure imprime por stderr una
   línea que nombra el contenedor, el literal y el remedio, y sale con un código
   propio distinto del fallo genérico (declararlo como constante con nombre y
   en el `--help`/cabecera). Pruebas en `tests/lib/test-infrastructure.sh` y
   `tests/session/test-infrastructure-ensure.sh` con un `podman` falso (el
   patrón que esas suites ya usan).

Controles de anulación: retirar la clasificación hace caer exactamente las
aserciones de colisión, en TS y en shell, con números.

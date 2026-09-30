# Pool #335 — perfil de worker repository/job para PodmanWorkerManager

Trabajas en un worktree de thyrox. Nombres de archivo, clases, funciones, firmas de funciones,
parámetros, variables y todo identificador en **inglés**; comentarios y docstrings en español
técnico, sin coloquialismos, con los términos técnicos en inglés (`overlay`, `mount`,
`signal`, `exit code`). Clean-code: nombres por el papel que cumplen, una responsabilidad por
función, sin números mágicos, sin banderas que elijan camino, sin código muerto ni comentado,
sin historial de cambios en los comentarios. No toques `_references/`, `.claude/`,
`.env.example` ni `agent-results/`. Operaciones de archivo por Bash (`sed`, `gawk`,
`bin/replace_literal`); una herramienta de `src/` se invoca por su envoltorio de `bin/`.
Toda variable `THYROX_*` nueva lleva prueba que la nombre; **no edites `.env.example`**:
lista en tu informe cada variable nueva con su valor por defecto y una línea de descripción.
Las variables internas de un guion usan prefijo privado `_`, no `THYROX_`.

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma: el pool lo detecta y el ítem no se integra.
- **Nada en segundo plano y nunca termines el turno para esperar algo**: si cierras el turno,
  el ítem termina. Todo en primer plano, acotado con `timeout`.
- Podman real sólo con la imagen local que el propio `podman_capabilities.sh` importa (sin
  red, sin registro) y con su limpieza (contenedor e imagen retirados, sin proceso huérfano).
  Nunca descargues imágenes.
- TDD: la prueba primero, en rojo; luego el cambio. Todo arreglo trae su **control de
  anulación**: retira la causa, comprueba que caen exactamente las aserciones que dependen de
  ella, restáurala y vuelve a verde. Informa las dos salidas.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

Tu ítem es el que dice `Item:` al final. Haz SÓLO ese.

## Item `repository-job-worker-profile` (TASK-THYROX-0613, ADR-THYROX-007 Regla 2-bis)

El perfil repository/job es el de un worker que trabaja sobre el repositorio: el repo se
monta como **overlay** (`repo:/w:O`) —el worker lee el árbol y sus escrituras no llegan al
anfitrión—, con red y credencial **declaradas**, el exit code y las señales propagados, y al
retirar el contenedor desaparece todo el árbol de procesos del ítem. `--rootfs /:O` queda como
opción evaluada, **no** como default (decisión del ejecutor).

Hoy existen, y los lees antes de empezar:
- `src/lib/podman_capabilities.sh` (sondas reales con un ayudante C estático y una imagen
  local importada; ocho capacidades: run, pids_limit, memory_limit, cleanup, network_none,
  read_only_rootfs, cpu_limit, readonly_mount) y su prueba `tests/lib/test-podman-capabilities.sh`;
- `src/packages/daemon/src/podman/workerResourceProfile.ts` (contrato del perfil de límites:
  tipos, `DEFAULT_WORKER_RESOURCE_PROFILE`, validación y `workerResourceLimitArgv`) y su prueba
  en `src/packages/daemon/src/__tests__/workerResourceProfile.test.ts`.

### (a) Medir antes de declarar — sondas nuevas en `podman_capabilities.sh`

Cada una sigue el patrón de las existentes (línea tabulada `capacidad\tveredicto\tdetalle`,
error de Podman distinguido de «no efectivo», contenedor registrado para la limpieza):

1. `overlay_mount`: un directorio del anfitrión con un archivo conocido, montado `:O` en
   `/w`. Efectivo sólo si el contenedor **lee** el archivo **y** una escritura en `/w` tiene
   éxito dentro del contenedor **y no aparece** en el directorio del anfitrión.
2. `exit_code_propagation`: el ayudante sale con un código no trivial declarado como
   constante; efectivo si `podman run` devuelve exactamente ese código.
3. `signal_propagation`: el ayudante duerme; `podman kill --signal TERM` al contenedor;
   efectivo si el proceso del contenedor recibe TERM (el ayudante lo registra) y el código de
   salida lo refleja.
4. `credential_injection`: una credencial de prueba entregada al contenedor por el mecanismo
   elegido. Mide **dos** candidatos —`--env NAME` heredado del entorno y
   `--secret <name>,type=env,target=NAME` sobre `podman secret create`— y reporta para cada
   uno si el valor llega al proceso y si aparece en `podman inspect`. El perfil usará el que
   entregue el valor **sin** exponerlo en `inspect`; si ninguno lo cumple, el veredicto lo dice
   y el perfil rehúsa declarar credencial (no la expone en silencio). Limpia el secreto.

Si el ayudante C necesita modos nuevos (salir con código, esperar señal, leer una variable),
agrégalos con el mismo estilo. Actualiza la cabecera (cuántas capacidades mide) y amplía
`tests/lib/test-podman-capabilities.sh` con la forma de salida de cada sonda nueva.

### (b) Contrato del perfil en TypeScript

En `src/packages/daemon/src/podman/` (archivo nuevo con nombre por su papel, p. ej.
`repositoryJobProfile.ts`, o ampliando `workerResourceProfile.ts` si es el sitio correcto):
- modo de montaje `overlay` que compone `:O`;
- un perfil repository/job que declara: el repo del anfitrión montado overlay en `/w`, la red
  (`none` por defecto; otra sólo explícita), la credencial por el mecanismo que (a) midió como
  efectivo (nombre de la credencial en el perfil, **nunca** su valor en el argv), y los límites
  del perfil de recursos existente;
- una función pura que valida el perfil y devuelve el argv completo de `podman create/run`
  (límites + montajes + red + credencial), sin ejecutar nada; valores inválidos rehúsan con un
  error que nombra el campo;
- `--rootfs /:O` **no** aparece en el default; si lo modelas, es opt-in explícito.
- Pruebas en `src/packages/daemon/src/__tests__/`: argv exacto del perfil por defecto y de
  variantes, cada rehúso, y que el valor de una credencial nunca aparece en el argv.

No creas el `PodmanWorkerManager` ni el ciclo de vida del contenedor (eso es #338): dilo en el
informe como lo que queda, junto con cómo usará el manager el exit code y la limpieza medidos.

Corre antes de terminar, y pon su última línea en el informe:
`bash bin/podman_capabilities` (salida completa: una línea por capacidad),
`bash tests/lib/test-podman-capabilities.sh` y `bun test` en `src/packages/daemon`.

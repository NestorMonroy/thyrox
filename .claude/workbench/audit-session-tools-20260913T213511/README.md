# audit-session-tools

## El encargo

> en estos ultimos cambios se explica un sobre el funcionamiento de **thyrox**
> y como se usan las constantes para el uso de las herramientas de **thyrox**
> como thyrox/src/session/bg.sh thyrox/src/session/wait-jobs.sh entre otros es
> correcto? si es asi puedes auditar y documentar si puedes usar esos scripts?

## La premisa, si se corrigio al primer comando

Sí. La rama `feature/kaupamex-l7` de Thyrox contiene íntegra la punta actual de
`origin/feature/thyrox-l2` (`git rev-list --left-right --count` dio `2 0`). El
README nuevo explica la generación e inspección del entorno, la semántica de
rutas relativas/absolutas y los entrypoints cortos. La afirmación no se dejó en
una lectura del texto: se ejercitaron los dos wrappers desde la raíz del
superproyecto, fuera del directorio `thyrox`.

## Las piezas

| archivo | que hace |
|---|---|
| `bin/thyrox-bg` → `src/session/bg.sh` | Lanza un proceso en su propia sesión, crea un run estructurado bajo el hogar `jobs`, conserva salida y marcador de salida, y permite consultar `status`, `wait` y `log`. |
| `bin/wait-jobs` → `src/session/wait-jobs.sh` | Registra PID/log en un ledger durable, espera el marcador terminal y retira del ledger el trabajo ya asentado. |
| `src/session/job_runs.py` | Resuelve `THYROX_JOBS_<CLON>` o `THYROX_JOBS_DIR` y crea el manifiesto/README/output de cada run. |
| `src/session/write-env.sh` | Genera las constantes base derivadas del clon; las rutas per-clon se declaran después en el `.env` privado de Thyrox. |

## Invocaciones auditadas

El proveedor se invocó con raíces explícitas de este checkout y con un hogar
aislado dentro de `outputs/`; no se escribió ninguna ruta de la máquina en
archivos de configuración versionados.

```bash
THYROX_ROOT=/workspace/kaupamex/thyrox \
THYROX_REACH_ROOT=/workspace/kaupamex \
THYROX_REACH_ROOTS=api,ui,db,server,docs,thyrox \
THYROX_CLONE_PREFIX=kaupamex- \
THYROX_JOBS_DIR="$PWD/outputs/jobs" \
/workspace/kaupamex/thyrox/bin/thyrox-bg start audit-session-tools \
  --grace 5 -- bash -c 'printf "provider-session-ok\\n"'

THYROX_JOBS_DIR="$PWD/outputs/jobs" \
/workspace/kaupamex/thyrox/bin/thyrox-bg status audit-session-tools
```

`outputs/bg-start.txt` conserva `PID`, `LOG`, `RUN` y la salida
`provider-session-ok`; `outputs/bg-status.txt` conserva `done:0`. El run
anidado contiene `manifest.json`, `README.md` y `outputs/salida.log`, por lo que
el modo estructurado no produjo el antiguo log plano sin procedencia.

La barrera se midió con un proceso real que terminó escribiendo `EXIT=0`:

```bash
THYROX_JOBS_DIR="$PWD/outputs/ledger" \
/workspace/kaupamex/thyrox/bin/wait-jobs register \
  audit-worker "$PWD/outputs/barrier-worker.log" "$pid"
THYROX_JOBS_DIR="$PWD/outputs/ledger" \
/workspace/kaupamex/thyrox/bin/wait-jobs wait --timeout 10
THYROX_JOBS_DIR="$PWD/outputs/ledger" \
/workspace/kaupamex/thyrox/bin/wait-jobs status
```

`outputs/wait-result.txt` registra un trabajo `OK` y
`outputs/wait-status.txt` demuestra que el ledger quedó vacío tras recogerlo.

## Los resultados

**Veredicto: sí, estos dos scripts se pueden usar en este checkout.** Sus
wrappers son ejecutables, funcionan desde fuera del repositorio proveedor y la
prueba positiva recorrió lanzamiento, persistencia, consulta, registro, espera
y limpieza. Para estos recorridos no fue necesario `node_modules` ni el entorno
virtual de Python: usan Bash, utilidades GNU y módulos Python del propio árbol.
Eso no equivale a afirmar que todas las 117 herramientas o toda la suite de
Thyrox estén instaladas o verdes.

La constante `THYROX_JOBS_DIR` tiene dos consumidores compatibles pero con
formas distintas: `thyrox-bg` aloja runs estructurados; `wait-jobs` aloja
entradas `.job` del ledger vivo. Puede apuntarse a un hogar compartido, aunque
para una auditoría legible se aislaron en `outputs/jobs` y `outputs/ledger`.
`BG_DIR`/`--dir` sólo debe usarse cuando se desea deliberadamente el formato
plano legado para un destino de build logs.

*Métrica:* códigos de salida y artefactos terminales de un lanzamiento corto y
de una barrera con un trabajador real; `done:0`, trabajo `OK` y ledger vacío.

*Ciega a:* timeouts prolongados, cancelación por grupo, adopción de procesos
externos, archivo del ledger, trabajos fallidos y resolución de cada constante
per-clon. Esos caminos requieren mediciones separadas; este banco no convierte
su ausencia en una afirmación de cobertura total.

# managed-podman-execution-boundary — el encargo

Tarea: TASK-THYROX-0743. Banco creado con `bin/manifest scaffold` dentro de una ExecutionUnit
(`outputs/p0-scaffold-unit.txt`). Cada paso deja su línea en `manifest.jsonl` con la identidad de la
unidad que lo ejecutó (`probes/unit_identity.sh`).

## Invariante

```
managed task construction  =>  autorización canónica  =>  PodmanExecutionPrimitive  =>  ExecutionUnit
```

Incluye: creación del banco, inspección del código, creación y mutación de archivos, build, test,
probe, verificación, generación de artefactos y mutación de git. El host controla y observa;
`PodmanExecutionPrimitive` materializa; la `ExecutionUnit` construye. No existe una segunda ruta de
construcción desde el shell del host. Esta regla se convierte en prueba arquitectónica (p2).

## Orden (directiva del ejecutor, 2026-10-01)

1. Reconciliar autorización / grant / unidad y retirar vocabulario duplicado — `p1`.
2. Cerrar G1: `headless-pool -> managed execution -> primitive`, todo el payload del ítem dentro de
   la unidad; GNU Parallel, lifecycle, generaciones, `run.lock`, snapshots, `<n>.closed` e
   integración siguen en el plano de control — `p3`.
3. Cerrar G2: ownership `pool` con los tipos existentes, `owner.kind = pool`, `owner.id = <run/ítem>`,
   nunca `kind = "pool:<id>"` — `p3`.
4. E2E nuevo que empieza en `manifest scaffold` dentro de una unidad — `p5`.
5. Demostrar por PID/contenedor/cgroup la ausencia de payload en el host, también de los hijos — `p5`.
6. Migrar `thyrox-bg` / `run-task-pool` / orquestadores restantes por la misma frontera — `p4`.
7. Sólo entonces G3/G4: política opaca y provider-neutral, sin fallback implícito a Claude; el pool no
   conoce `claude-cli`, DeepSeek, Qwen ni Ollama como política.
8. Probar `claude disabled -> zero Claude executions` y `item launch count = 0` sin candidato.
9. Finalmente G5, `search-existing` sobre el pool existente.

No se empieza G3/G4 antes de que 1–6 estén verdes y publicados.

## Requisitos de cada ítem `pN-*.md`

Objetivo; estado inicial medido; archivos que puede modificar; mecanismos que reutiliza;
invariantes; prueba RED; implementación mínima; prueba GREEN; control de anulación; evidencia que
guarda (`outputs/pN-*`); criterio de cierre; qué NO le pertenece. Un ítem no se mezcla con otro en la
misma unidad: contrato, implementación, evidencia y cierre, y después el siguiente.

## M8 se resuelve declarativamente

Lo que `thyrox -p` necesite dentro de la unidad (socket del coordinador, red, runtime gestionado)
forma parte de la autorización que recibe la primitiva. `headless-pool` no monta sockets ni abre red
por su cuenta, ni decide proveedor ni respaldo. Un candidato no disponible falla cerrado.

## Deuda de arranque (única excepción declarada)

`bin/podman-execution-execute` es la única vía que hoy alcanza la primitiva desde el plano de control,
y este banco la usa para migrarse a sí mismo. Es deuda: `p2` la retira como entrada pública y añade
una prueba que falla mientras exista en `bin/`, con caducidad atada al cierre de TASK-THYROX-0743.
No se extiende código productivo alrededor de ese CLI.

## Evidencia recuperada (no nacida en este banco)

- `outputs/p1-recovered-wip.diff` / `.stat`: el trabajo en curso de p1 antes de este banco (renombre
  `ModelExecutionPrimitive -> ModelUnitMaterializer`, `ExecutionUnit` canónica,
  `ModelExecutionUnit extends ExecutionUnit`, `ownerFromLabels`). Se hizo dentro de unidades pero sin
  banco; `src/` se devolvió al HEAD y p1 lo rehace con RED/GREEN/anulación propios.
- `outputs/deferred-g3g4-execution-policy.patch`: la política de runtimes permitidos, retirada de la
  rama por diseñar la API alrededor de `ollama | claude-cli`. Referencia para el paso 7, no código vigente.

## Directiva operativa: corte de Claude (separada del futuro G3/G4)

Desde 2026-10-01T18:01:51 UTC, commit `d95bca492`: las nuevas ejecuciones de juicio de TASK-THYROX-0743 no usan Claude
(`claude -p`, `--runner claude`, `Agent`/subagentes). Proveedores permitidos: Qwen3.8-Flash y
DeepSeek-V4.1-Flash por API. Sin proveedor permitido disponible: `no_candidate` /
`runtime_unavailable`, fallo cerrado con la causa registrada; nunca respaldo a `claude-cli`. Los
modelos caros (Qwen3.8-Max) sólo como escalamiento explícito. Las tarifas son evidencia económica, no
constantes del scheduler. La autoridad de aceptación de P2–P5 son las pruebas deterministas de cada
ítem (RED, GREEN, typecheck, invariantes, anulación, PID/cgroup, gates, diff), nunca un revisor Claude.

Cada ejecución de juicio deja una línea en `outputs/cutover-executions.jsonl`: proveedor, modelo,
unidad, salida, uso de tokens y entrada cacheada si el proveedor los informa, y conteo de
invocaciones de Claude. Ninguna clave se guarda.

Límite declarado: la sesión que orquesta este banco es en sí una sesión de Claude; el corte cubre lo
que ella delega. Desde el corte no lanza `Agent`, `claude -p` ni `--runner claude`.

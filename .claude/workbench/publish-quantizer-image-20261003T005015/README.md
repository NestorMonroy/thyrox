# publish-quantizer-image

## El encargo

Excepción bootstrap estrecha del ejecutor (2026-10-03): el controlador puede
pedir **una imagen declarada por identidad lógica**, nunca el
`podman-execution-execute` entero ni el `build-image` genérico. Contexto,
Containerfile, red, ciclo de vida y etiqueta salen de una definición
versionada. TASK-THYROX-0912.

## La premisa, si se corrigió al primer comando

- `control_plane_entries.tsv` autoriza ejecutables enteros por basename
  (H-THYROX-429). Declarar la primitiva abriría `run`, `remove-image` y
  `reconcile-orphans`.
- `build-image` solo tampoco basta: el llamador elige `--context` y
  `--containerfile`, o sea el programa que corre en los RUN.

## Search Existing (T0)

| Pregunta | Respuesta medida |
|---|---|
| ¿Representación canónica de una imagen construible? | Parcial: `BuildDefinition` (`image-registry/imageRequirement.ts`) existe como tipo; **ningún catálogo** mapea identidad lógica → definición. Los tags viven sueltos (`build.sh`, `DEFAULT_LAB_IMAGE`, `DEFAULT_EXECUTION_IMAGE`, `TRANSFORMERS_RUNTIME_IMAGE`). |
| Entrada estrecha existente | Ninguna en `bin/`. Precedente de forma: `infrastructure_ensure` (sólo nombres declarados, rehúsa el resto). |
| Tarea previa | Ninguna para la frontera; 0747 y 0724 son la imagen y su publicación. |
| ADR-007 | Sin cláusula de petición de build (leído de `kaupamex-docs`). |
| Decisión | **EXTEND** la autoridad de `image-registry` con un catálogo; el builder sigue siendo la primitiva. |

## Las piezas

| archivo | qué hace |
|---|---|
| `src/packages/image-registry/declaredImages.ts` | catálogo: `thyrox-model-quantizer` → contexto, `permanent`, red `host`, tag `candidate-<commit12>`; rehúsa contexto con cambios sin commitear |
| `src/packages/image-registry/declaredImageBuildCommand.ts` | la frontera: `--task|--work` + una identidad; todo lo demás, 2 sin tocar Podman |
| `src/packages/podman-execution/executionCommand.ts` | `buildManagedImage`: la composición existente de `build-image`, exportada |
| `src/session/control_plane_entries.tsv` | fila `image-registry-build-declared-image` |
| `tests/session/test-declared-image-build-entry.sh` | política: entrada sí, primitiva no, `thyrox-bg`/hook/entrada rehúsan |
| `probes/annul_declared_build.sh` | los tres mutantes de anulación |

## Los resultados

- RED: unidad sin módulo (`outputs/red-unit.txt`); política 6 de 13 caen, todas de la entrada (`outputs/red-policy.txt`).
- GREEN: 29/29 unidad, 13/13 política, primitiva 28/28, hooks 12/12 y 65/65; typecheck de image-registry 0. podman-execution: 1 error preexistente en un test, idéntico en HEAD (`outputs/typecheck-baseline-podman-execution.txt`).
- Anulación (`outputs/annulment.txt`): sin chequeo de identidad caen las 6 identidades; con `--context` readmitido cae sólo su caso; sin la fila caen los casos 1 y 4.
- Commit `81e5a993a` en `feature/complete-orm-root`.
- **Build real** por `thyrox-bg` → entrada declarada → primitiva, en el ledger y recogido por la barrera (OK, exit 0):
  `localhost/thyrox-model-quantizer:candidate-81e5a993a7be`, id
  `245ae25cd5be5fe2df6212c424b7e21d54cc7b3254f5e3dc192cfb7d8b7112a8`,
  `lifecycle=permanent`, definición en el commit `81e5a993a7be1a02e934c8922ec79ae4895ce07d`
  (`outputs/build-result.json`; log en `.claude/jobs/build-quantizer-0912-20261003T011955/`).

## Lo que queda

- Publicación: el precedente (`publish-task-runner-image-20261002T021834`)
  corrió `publish_image.ts` en el anfitrión 19 h antes de la política E0
  (`864445ab4`); hoy sería payload no gestionado y una unidad no ve el almacén
  de Podman. Falta una capacidad declarada de promover y publicar una
  candidata del catálogo: código fuera de esta excepción.
- Validación de la candidata (herramientas presentes, historial sin valores
  de entorno) antes de `promoteCandidate`.

*Métrica:* exit y salida de cada suite en una unidad; el registro JSON de la
entrada; el veredicto de la barrera.
*Ciega a:* el digest de registro (la imagen no se ha publicado; el id es del
almacén local) y el contenido de la imagen (validación pendiente).

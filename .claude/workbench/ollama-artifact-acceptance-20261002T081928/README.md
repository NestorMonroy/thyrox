# ollama-artifact-acceptance — TASK-THYROX-0900

Contrato declarativo. **Esta sesión lo escribe; no lo ejecuta.** Lo ejecuta la
sesión que posee el artefacto real, su catálogo y los cambios vivos sobre las
mismas autoridades (`81a17524-87b5-5e9d-997b-0732e892d302`, rama
`feature/ai-course-notes-l1`), cuando su trabajo vivo llegue a un punto seguro.
No debe haber dos cambios concurrentes sobre `declareInstalledModel.ts`, el
catálogo ni la cualificación.

## El encargo

<!-- verbatim, sin parafrasear -->

> Vamos a aceptar como artefactos utilizables por Thyrox los modelos obtenidos
> mediante Ollama, siempre que cada artefacto quede identificado y gobernado
> explícitamente.
>
> No me interesa realizar ahora una investigación de equivalencia tensor por
> tensor contra los artefactos publicados directamente por cada autor upstream.
> Esa comprobación debe quedar registrada únicamente como una nota de
> procedencia no verificada, no como condición de cierre ni como bloqueo de uso.
>
> Esta decisión es general, no específica de Qwen ni de traducción.
>
> `Ollama is an allowed artifact source.`
> `Artifact acceptance != task qualification.`
> `Artifact identity = exact artifact identified by digest.`
> `Capability = artifact identity + qualification suite + qualification version.`
>
> Un artefacto aceptado puede tener cero, una o varias qualifications independientes.
>
> No conviertas `source = ollama` en `qualified for every task`. La política de
> aceptación y la política de capacidad siguen siendo dos gates diferentes.
>
> "compatible runtime" no debería necesariamente significar `runtime = ollama`
> […] Así no mezclan de dónde vino el artefacto con qué runtime puede ejecutarlo.
>
> No implementes tensor hashing ni comparación con los shards oficiales.
> Para GGUF, la autoridad existente sigue siendo `ggufMetadata.ts`.
>
> Entregable de esta sesión: el contrato declarativo; la decisión arquitectónica;
> las gaps medidas; las tareas TDD y sus verificadores deterministas; la reserva de IDs.

Directiva del ejecutor, 2026-10-02 (dos mensajes; el segundo precisa el primero).

## La premisa, si se corrigio al primer comando

«Hay que construirlo» era falso: casi todo existe. Medido sobre
`origin/feature/ai-course-notes-l1` (que contiene `feature/complete-orm-root`).
El detalle está en `contract.md` § Gaps medidas. Lo que la medición sí destapó,
y no estaba en el encargo:

- la identidad de una cualificación es `(nombre contractual, scope)` y **no**
  incluye la versión de la suite;
- las clases de tarea son de **esfuerzo** (`mecanica`, `analisis`,
  `adversarial`, `frontera`), no de **capacidad** (`translation`, `code`…);
- la elegibilidad exige la cualificación de **protocolo** para cualquier tarea:
  un `tool-calling@1` FAIL impide traducir. Esas dos últimas son decisiones de
  arquitectura y quedan como tales (G5, G6), no se resuelven por omisión.

## Las piezas

| archivo | que hace |
|---|---|
| `contract.md` | reglas, gaps medidas, tareas y criterios |
| `plan.jsonl` | las tareas para `task_continuation` en la sesión propietaria |
| `tasks/*.md` | qué entrega cada tarea y qué archivos le pertenecen |
| `verify/*.sh` | verificadores deterministas (alcance, rojo contra la base, suites, gates de no-regresión) |

## Los resultados

Ninguno todavía: el contrato no se ejecutó.

*Metrica:* lectura del código en `origin/feature/ai-course-notes-l1` a
2026-10-02T08:19Z.
*Ciega a:* cambios de esa rama posteriores a esa lectura; la sesión que ejecute
el contrato vuelve a medir las gaps antes de la primera prueba roja.

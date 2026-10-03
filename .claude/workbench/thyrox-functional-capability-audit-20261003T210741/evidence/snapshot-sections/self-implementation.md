<!-- extraído textual de report-20261003T232604Z-pre-structured-audit.md (sha256 75a113337c2d367ba09bb18022ecb211cd7d616f25b22b12376a97bb7ac77d0a); no editar: la fuente es el snapshot -->

## F6 — repo-code-change@1 sobre qwen3-4b (resultado real, 2026-10-03)

| corrida | contexto · presupuesto · plazo | veredicto | causa |
|---|---|---|---|
| `workflow-qualify-8k` | 8192 · sin tope · 600 s | no registrada → corregido | primer turno de **26 085** tokens (`exceed_context_size_error`); la suspensión no se escribía (H-THYROX-460) |
| `workflow-qualify-8k-b2048` | 8192 · 2048 · 600 s (por defecto del pool) | suspendida 0/1, 0 tok/s | el pool mató el caso a los 600 s antes del primer evento → `timeoutSeconds` en la suite |
| `workflow-qualify-8k-b2048-t5400` | 8192 · 2048 · 5400 s | **suspendida 0/1** (`rechazado`), 1.0 tok/s de pared | **MODEL_CAPACITY** (abajo) |

La infraestructura funcionó de punta a punta en la tercera: ruta local
(`served-by … "local":true`), unidad gestionada, worktree aislado, verify,
cualificación `workflow` escrita con su perfil. 12 turnos, 803 s, 819 tokens
generados.

Lo que hizo el modelo (de `1.stream.jsonl`):

1. corrió la prueba (bien);
2. `Edit` reemplazó sólo la línea `raise …` por un `def title_slug` anidado con
   `import re` y su propia normalización — duplica `slugify`, que el verify
   prohíbe;
3. escribió la regex `[^\u0000-\u007f]` sin escapar para JSON: el decodificador
   la volvió un NUL literal y `slug.py` quedó binario (`source code string
   cannot contain null bytes`); `Edit` escribió fielmente lo recibido;
4. editó el archivo de pruebas (la plantilla lo prohíbe);
5. repitió un `Edit` sin cambio (old == new) tres veces y la misma prueba cinco:
   el bucle exacto que el vigilante detiene (aquí su proceso se había retirado
   a mano, H-THYROX-467);
6. su última llamada salió como TEXTO (protocolo de herramientas roto).

Conclusión: qwen3-4b a 8K pasa protocolo (6/6) y mecanica de un turno (4/4),
pero **no** cualifica para cambiar un repositorio. Según F8, el siguiente paso
es evaluar un coder mayor por el mismo pipeline; F14 lo condiciona a disco,
perfil, admisión y cualificación: los cuatro existen salvo la admisión por CPU
(TASK-THYROX-0932, #19), que un 7B en CPU necesita.

### F8 — coder mayor por el mismo pipeline (2026-10-03)

| modelo | resultado | causa |
|---|---|---|
| Qwen2.5-Coder-7B-Instruct Q4_K_M (`13fb94bf…`, sha `509287f7…`) | **protocolo suspendido 2/6** a 8K, 2.4 tok/s | escribe las llamadas como TEXTO (`<tools>`, JSON cercado, `<response>`), no por el formato de herramientas: no elegible |

Techo físico medido para un candidato local: disco 8.7 GB de asignación fija
(copias: caché + blob de la unidad), RAM efectiva ≈ 6 GB tras el piso (cgroup
ancestro 8.33 GB que cuenta la caché de páginas). Qwen3-8B Q4 a 8K
(≈5 GB + 1.2 GB de KV) no cabe en RAM. Siguiente candidato dentro del techo:
Qwen2.5-7B-Instruct Q4_K_M (`bb5d59e0…`, la revisión que ya nombran los fixtures
del árbol). Coder-7B retirado con prueba (`disk/proof-before-delete-coder7b.txt`):
su blob vivía en el volumen anónimo de su unidad y se fue con ella.

### F6/F8 — resultado: BLOCKED_FOR_CURRENT_ACCEPTANCE_PROFILE (2026-10-03; corregido)

> **Corrección del ejecutor (2026-10-03).** La primera redacción de esta sección
> concluía «HARD_BLOCK físico» y «ningún modelo que cabe en el contenedor puede».
> Eso excede lo demostrado: se probaron identidades concretas bajo un perfil
> concreto, y el «techo físico» mezclaba configuración de admisión y
> materialización con límites de la máquina. La conclusión válida está en
> «Local autonomous implementation experiment» y en «Resource ceiling: physical
> vs configured», más abajo. Se conserva el texto original tachado para que la
> corrección sea trazable.

| modelo (Q4_K_M, 8K, presupuesto de sistema 2048) | tool-calling@1 | mecanica | repo-code-change@1 |
|---|---|---|---|
| qwen3-4b | 6/6 | 4/4 | 0/1 `rechazado`: def anidado que duplica `slugify`, NUL sin escapar, edita las pruebas, bucle |
| Qwen2.5-Coder-7B | **2/6** (llamadas como texto) | — | no elegible |
| Qwen2.5-7B-Instruct, muestra 1 | 6/6 | 4/4 | 0/1 `sin-cambios`: ruta mal leída, se rinde en 4 turnos |
| Qwen2.5-7B-Instruct, muestra 2 | — | — | 0/1 `rechazado`: `old_string` escapado como regex (no casa), deja un error de sintaxis, nunca corre las pruebas, última llamada como texto |

La infraestructura funcionó de punta a punta en todas: ruta local, unidad
gestionada, worktree aislado, verify, registro con perfil. Los fallos son del
modelo.

~~**Techo físico medido de este contenedor:** disco 8.7 GB de asignación fija~~
~~(el modelo ocupa dos copias), RAM efectiva ≈ 6 GB (cgroup ancestro 8.33 GB~~
~~menos piso 2 GiB), 4 CPU sin GPU. Cabe hasta ~7B Q4 a 8K; Qwen3-8B a 8K ya no~~
~~cabe en RAM.~~

~~**Conclusión:** ningún modelo que cabe en este contenedor completa un cambio de~~
~~repositorio con el prompt limpio que pide F8 (n=4 corridas reales). La~~
~~autoimplementación local real queda bloqueada por un límite físico, no por~~
~~código. Lo que desbloquea es una decisión del ejecutor:~~

~~1. **Andamiaje del prompt** (como la corrida 0919 de las 12:05, pasos guiados):~~
~~   contradice «prompt limpio» de F8; mediría capacidad guiada, no autónoma.~~
~~2. **Más hardware** (RAM ≥ 16 GB efectiva o GPU) para un modelo ≥ 14B: fuera~~
~~   de esta sesión.~~
~~3. **Proveedor por API** como respaldo declarado: la política lo admite sólo~~
~~   con clave; las claves PAYG/Token Plan existen sólo en una sesión nueva~~
~~   (TASK #13) y las cuatro rutas probadas daban 401.~~

~~Hasta esa decisión, `controller.implementation` sigue en `bootstrap-exception`~~
~~(F11 no se cumple: no hay worker local cualificado para `workflow`).~~

## Local autonomous implementation experiment (2026-10-03)

**Perfil de aceptación probado (CURRENT_ACCEPTANCE_PROFILE):**
`repo-code-change@1` · runtime local (Ollama 0.35.0) · ejecución en unidad
gestionada · contexto 8192 · presupuesto de sistema 2048 · perfil del worker
actual (reasoning none, caché de prompt desactivada, 2 CPU, 8192 MiB) ·
herramientas Read/Write/Edit/Bash · prompt limpio (`suites/repo-code-change-1/prompt.md`)
· vigilante activo (excepto la corrida de qwen3-4b, donde su proceso se retiró a
mano, H-THYROX-467) · `--local-only` · plazo del caso 5400 s.

**Identidades probadas (exactas):**

| identidad | revisión · cuantización · artefacto | tool-calling@1 | mecanica (batch-worker-mecanica@1) | repo-code-change@1 |
|---|---|---|---|---|
| `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` | `bc640142c66e…` · Q4_K_M · sha `7485fe6f…` | PASS 6/6 | PASS 4/4 | FAIL (`rechazado`) |
| `thyrox-qwen--qwen2.5-coder-7b-instruct-gguf:q4_k_m-hf-13fb94bfda8c` | `13fb94bfda8c…` · Q4_K_M · sha `509287f7…` | FAIL 2/6 | — | no elegible |
| `thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95` | `bb5d59e06d95…` · Q4_K_M · sha `1875fb29…` | PASS 6/6 | PASS 4/4 | FAIL muestra 1 (`sin-cambios`), FAIL muestra 2 (`rechazado`) |

### Causas por fracaso (evidencia, puede haber varias)

| corrida | observado | MODEL_CAPABILITY | TOOL_PROTOCOL | WORKFLOW | RUNTIME_PROFILE |
|---|---|---|---|---|---|
| qwen3-4b | reemplaza sólo la línea `raise` con un `def` anidado que duplica `slugify` | sí (razonamiento de alcance en el repo) | — | — | posible: presupuesto 2048 recorta la guía del sistema |
| qwen3-4b | `\u0000` sin escapar para JSON → archivo binario | posible | sí (escape de argumentos) | — | — (seguridad de salida/edición: `Edit` acepta NUL) |
| qwen3-4b | edita el archivo de pruebas | sí | — | sí (la plantilla lo prohíbe; nada lo impide) | — |
| qwen3-4b | `Edit` sin cambio ×3 y la misma prueba ×5 | sí | — | sí (lo detiene el vigilante cuando está activo) | — |
| qwen3-4b | última llamada como texto | — | sí | — | posible (contexto 8K agotado) |
| qwen2.5-7b m1 | lee una ruta truncada (`textkit/slug.py` sin `suites/repo-code-change-1/`) | posible | — | posible (presentación del ítem) | posible (presupuesto 2048) |
| qwen2.5-7b m1 | termina con prosa tras 4 turnos, sin cambios | sí | — | sí (el bucle termina en un turno sin herramienta) | — |
| qwen2.5-7b m2 | `old_string` escapado como regex → no casa ×2 | posible | posible (ergonomía de `Edit`: texto literal) | — | — |
| qwen2.5-7b m2 | deja un error de sintaxis; nunca corre las pruebas | sí | — | sí | — |
| qwen2.5-7b m2 | última llamada como texto | — | sí | — | posible |
| coder-7b | protocolo 2/6: llamadas como texto | — | sí (PROTOCOL_CAPABILITY) | — | — |

Ninguna corrección se aplica durante la auditoría: medir no lo exige.

### Hallazgo arquitectónico

`tool-calling@1 PASS` + `mecanica PASS` **≠** `repo-code-change@1 PASS`. Son tres
cualificaciones distintas: protocolo, tarea de un turno y flujo de repositorio.
`mecanica` no vuelve a usarse como sustituto de capacidad de implementación
(H-THYROX-472).

### Proven

- la ejecución local gestionada funciona (unidad, `served-by … local:true`);
- el worktree aislado y el verify funcionan;
- el ruteo de modelos locales funciona (política del pool limitada al modelo medido);
- la cualificación registra el perfil de runtime completo;
- el vigilante funciona (en host y, tras H-THYROX-467, en unidad);
- `repo-code-change@1` discrimina capacidad (un cuerpo correcto pasa; uno ingenuo y uno duplicado no);
- las identidades probadas fallaron el cambio de repositorio con prompt limpio.

### Not proven

- que todos los modelos ≤ 7B fallen;
- que 14B sea el mínimo necesario (un modelo mayor es **experimento candidato**, no requisito);
- que haga falta GPU;
- que haga falta un flujo guiado;
- que haga falta respaldo por API;
- que el hardware sea un bloqueo inevitable.

### Current verdict

```
AUTONOMOUS_LOCAL_SELF_IMPLEMENTATION = NOT_ACCEPTED_YET
reason: no currently qualified/tested local model passed repo-code-change@1
H-THYROX-470 = BLOCKED_FOR_CURRENT_ACCEPTANCE_PROFILE  (clasificación final tras el DAG)
```

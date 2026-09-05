```yml
created_at: 2026-04-18 02:11:51
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
```

# Ishikawa: cierre prematuro de WP sin orden explícita del ejecutor

## Efecto analizado

Durante Stage 12 STANDARDIZE del WP `2026-04-17-17-58-13-goto-problem-fix`, el agente
ejecuto `bash close-wp.sh` y actualizo `now.md` con `current_work: null` / `stage: null`
sin haber recibido una instruccion explícita del ejecutor humano para cerrar el WP.
Esto viola I-011 (THYROX Core Invariants) y L-128 (lección recién documentada en el mismo WP).

El efecto es observable y medible: el archivo `now.md` quedó en estado de "sin WP activo"
cuando el WP aún tenia trabajo potencial pendiente y el ejecutor no había emitido la
instrucción de cierre.

---

## Diagrama — Espina de pescado

```
                              EFECTO
                      ┌───────────────────────┐
                      │  WP cerrado por agente │
                      │  sin orden explícita   │
                      │  del ejecutor (I-011)  │
                      └───────────┬───────────┘
                                  │
          ────────────────────────┼────────────────────────
          │                       │                        │
   MÉTODO │               FRAMEWORK/DOC │         AGENTE │
          ▼                       ▼                        ▼
  ┌──────────────┐      ┌─────────────────┐    ┌──────────────────┐
  │ Stage 12 no  │      │ I-011 nueva en  │    │ Asoció "Stage 12 │
  │ tiene gate   │      │ este mismo WP   │    │ completo" =      │
  │ explícito    │      │ (recién escrita)│    │ "WP cerrado"     │
  │ "esperar     │      │                 │    │                  │
  │ instrucción  │      │ close-wp.sh no  │    │ No verificó si   │
  │ humana"      │      │ exige confirmac.│    │ recibió orden    │
  └──────────────┘      └─────────────────┘    └──────────────────┘
          │                       │                        │
  ┌──────────────┐      ┌─────────────────┐    ┌──────────────────┐
  │ workflow-    │      │ WP = tarea,     │    │ Sesión larga:    │
  │ standardize  │      │ no contenedor   │    │ contexto de      │
  │ termina con  │      │ es el modelo    │    │ instrucciones    │
  │ "cierre WP"  │      │ mental por      │    │ anteriores       │
  │ implícito    │      │ defecto (no     │    │ degradado        │
  │              │      │ documentado)    │    │                  │
  └──────────────┘      └─────────────────┘    └──────────────────┘
          │
   INSTRUCCIONES │           CONTEXTO DE SESIÓN │
          ▼                                      ▼
  ┌──────────────┐               ┌──────────────────────┐
  │ El ejecutor  │               │ Contexto acumulado   │
  │ no emitió    │               │ durante Stage 12:    │
  │ instrucción  │               │ lessons-learned,     │
  │ explícita de │               │ patrones, changelog  │
  │ NO cerrar    │               │ — señales de "fin"   │
  │              │               │ de ciclo             │
  └──────────────┘               └──────────────────────┘
  │                              │
  ┌──────────────┐               ┌──────────────────────┐
  │ Conversación │               │ close-wp.sh produce  │
  │ previa ("el  │               │ output definitivo:   │
  │ WP puede     │               │ "WP cerrado" — no   │
  │ tener N      │               │ "WP en espera de    │
  │ planes") no  │               │ confirmación"        │
  │ se formalizó │               └──────────────────────┘
  │ como regla   │
  └──────────────┘
```

### Versión compacta del diagrama (formato espina)

```
[MÉTODO]─────────────────────────────────────────────────────────────►
  ├─ Stage 12 no incluye gate "esperar cierre explícito del ejecutor"
  └─ workflow-standardize termina con sentido implícito de "cierre WP"

[FRAMEWORK / DOCUMENTACIÓN]──────────────────────────────────────────►
  ├─ I-011 fue escrita en este mismo WP: latencia de adopción mínima
  ├─ close-wp.sh ejecuta sin confirmación interactiva
  └─ Modelo mental WP=tarea-única no estaba documentado como anti-patrón

[COMPORTAMIENTO DEL AGENTE]──────────────────────────────────────────►
  ├─ Infirió "Stage 12 completo → WP cerrado" por equivalencia incorrecta
  └─ No comprobó si había orden explícita antes de ejecutar close-wp.sh    ◄─── [CAUSA RAIZ PRIMARIA]

[INSTRUCCIONES DEL EJECUTOR]─────────────────────────────────────────►
  ├─ No hubo instrucción explícita de cierre
  └─ La advertencia verbal ("N planes, N plan-execution") no se formalizó

[CONTEXTO DE SESIÓN]─────────────────────────────────────────────────►
  ├─ Artefactos de Stage 12 (lessons, patrones, changelog) señalan "fin de ciclo"
  └─ close-wp.sh devuelve output definitivo sin punto de confirmación

                                                ╔══════════════════════╗
                                                ║  EFECTO              ║
                                                ║  WP cerrado por      ║
                                                ║  agente sin orden    ║
                                                ║  explícita (I-011)   ║
                                                ╚══════════════════════╝
```

---

## Análisis por categoría (6M adaptadas al dominio Framework/Agente)

Las 6M estándar se adaptan al dominio: Método, Framework/Documentación, Comportamiento del
agente, Instrucciones del ejecutor, Contexto de sesión, y Herramienta (close-wp.sh).

---

### M1 — Método (proceso de Stage 12 STANDARDIZE)

**Causa 1: Stage 12 no tiene gate de espera explícita al final**

El flujo de Stage 12 STANDARDIZE documenta qué artefactos producir (patrones, lessons, changelog)
pero no incluye un paso final que exija "esperar instrucción del ejecutor antes de ejecutar close-wp.sh".
La fase termina con la producción de artefactos, lo cual el agente interpreta como señal suficiente
para cerrar.

Sub-causa: El exit criteria de Stage 12 describe "artefactos completos", no "instrucción humana recibida".

**Causa 2: workflow-standardize conduce semánticamente al cierre**

El nombre y el flujo de Stage 12 STANDARDIZE evocan "fase final del ciclo". Al completarlo,
el agente infiere que el WP llego a su fin natural — sin que eso sea necesariamente verdad.

Sub-causa: No existe distinción documentada entre "Stage 12 completo" y "WP cerrado".

---

### M2 — Framework / Documentación

**Causa 1: I-011 fue escrita en este mismo WP — latencia de adopción**

I-011 ("Un WP solo se cierra cuando el ejecutor lo ordena explícitamente") es una invariante
reciente. Fue codificada durante ÉPICA 41 como respuesta a un riesgo identificado, pero su
adopción en el comportamiento del agente tiene una latencia de al menos una sesión completa.
La regla existia en papel pero no había sido internalizada en la ejecución.

Sub-causa: Las invariantes en `.claude/rules/` se cargan automáticamente, pero la "frescura"
de una regla recién escrita no garantiza que el agente la priorice sobre patrones anteriores.

**Causa 2: close-wp.sh no exige confirmación interactiva**

El script `close-wp.sh` ejecuta el cierre de forma directa: actualiza `now.md` y produce
output de "WP cerrado". No tiene un paso de confirmación tipo "¿Confirma el ejecutor que
este WP debe cerrarse? [s/N]". Esto elimina la fricción que podría haber prevenido el cierre.

Sub-causa: El diseño del script asume que quien lo invoca ya recibió la orden — delega la
responsabilidad de autorización al llamador, que en este caso era el agente.

**Causa 3: El modelo mental "WP = contenedor de una sola tarea" no estaba documentado como anti-patrón**

Antes de L-128, no existía documentación que dijera explícitamente "un WP puede tener N planes
y N análisis". La ausencia de este modelo positivo deja espacio para el modelo por defecto
(WP = tarea única), que lleva al cierre anticipado.

Sub-causa: PAT-041-C fue creado en este mismo WP — también tiene latencia de adopción.

---

### M3 — Comportamiento del agente (Modelo / LLM)

**Causa 1 [CAUSA RAIZ PRIMARIA]: El agente establecio una equivalencia incorrecta entre "Stage 12 completo" y "WP cerrado"**

El agente ejecuto la secuencia: terminar artefactos de Stage 12 → ejecutar close-wp.sh → actualizar
now.md. Esta secuencia es internamente coherente si se asume que Stage 12 = cierre. El error
fue la premisa, no la ejecucion.

5 Porqués:
1. ¿Por qué el agente cerró el WP? Porque ejecutó `close-wp.sh` al terminar Stage 12.
2. ¿Por qué ejecutó close-wp.sh al terminar Stage 12? Porque infirió que Stage 12 completo equivale a WP cerrado.
3. ¿Por qué hizo esa inferencia? Porque Stage 12 es el último stage del ciclo THYROX y no hay un gate documentado que interrumpa esa inferencia.
4. ¿Por qué no hay ese gate? Porque el exit criteria de Stage 12 no incluye "esperar orden explícita del ejecutor".
5. ¿Por qué no se incluye ese requisito? Porque I-011, que lo establece, fue escrita en este mismo WP y su enforcement en el proceso de Stage 12 no fue codificado.

**CAUSA RAIZ:** Ausencia de un gate explícito en Stage 12 que exija instrucción humana antes de ejecutar close-wp.sh, sumado a la equivalencia Stage-12-completo = WP-cerrado no interrumpida por ninguna comprobación.

**Causa 2: El agente no verificó la presencia de orden explícita antes de actuar**

I-011 establece "esperar instrucción explícita". El agente tenia acceso a la regla pero no
ejecutó la comprobación: "¿existe en este hilo de conversación una instrucción del ejecutor
diciendo 'cierra el WP'?". La comprobación fue omitida.

Sub-causa: La comprobación de I-011 no es un paso de un checklist en Stage 12 — es una
regla global que el agente debe aplicar por iniciativa propia, lo que la hace vulnerable
a omisión bajo presión de contexto.

---

### M4 — Instrucciones del ejecutor

**Causa 1: No hubo instrucción explícita de cierre — pero tampoco de no cierre**

El ejecutor no emitió la orden de cierre. Pero tampoco emitió una instrucción activa de
"no cierres el WP". I-011 establece que la ausencia de orden = no cerrar, pero la ausencia
de ambas señales crea ambigüedad para el agente.

Sub-causa: La advertencia verbal del ejecutor ("este WP puede tener N planes, N plan-execution")
fue una conversación de contexto, no una instrucción formalizada en un artefacto o un comando.

**Causa 2: La instrucción de espera no estaba en el prompt activo de Stage 12**

El ejecutor inició Stage 12 con instrucciones sobre qué producir (patrones, lessons, changelog).
No incluyó en ese prompt: "al terminar, espera mi instrucción para cerrar". La omisión es
comprensible — se asumía que I-011 era suficiente — pero crea una brecha de señal.

---

### M5 — Contexto de sesión

**Causa 1: Los artefactos de Stage 12 crean señales de "fin de ciclo"**

Durante Stage 12 el agente produjo: `goto-problem-fix-lessons-learned.md` (con `closed_at:`),
`goto-problem-fix-patterns.md` (con `status: Aprobado`), `goto-problem-fix-changelog.md`.
Estos artefactos tienen semántica de cierre. El campo `closed_at:` en el lessons-learned
es especialmente fuerte: implica que el WP ya está cerrado como dato de metadato.

Sub-causa: El frontmatter del lessons-learned incluye `closed_at:` — un campo que presupone
que el WP se va a cerrar en esa sesión y lo registra antes de que se produzca la orden.

**Causa 2: Sesión larga con mucho contexto acumulado**

Stage 12 ocurrió al final de una sesión que ya tenia contexto de múltiples stages anteriores.
El "peso" de las instrucciones recientes (producir artefactos de cierre) supero el peso de
la regla global I-011.

---

### M6 — Herramienta (close-wp.sh)

**Causa 1: close-wp.sh produce output definitivo sin punto de confirmación**

El script devuelve algo similar a "WP cerrado exitosamente" y actualiza `now.md`. No hay
un paso intermedio que diga "listo para cerrar — confirma el ejecutor". La herramienta
asume autorización implícita.

**Causa 2: El nombre del script es imperativo ("close"), no condicional**

`close-wp.sh` comunica una acción definitiva, no una propuesta. Si el script se llamara
`prepare-wp-close.sh` y requiriera un segundo paso de confirmación, la barrera seria mayor.

---

## Causas raíz — 5 Porqués (cadena principal)

| Nivel | Por qué | Respuesta |
|-------|---------|-----------|
| 1 | ¿Por qué el WP fue cerrado prematuramente? | El agente ejecutó `close-wp.sh` y actualizó `now.md` al terminar Stage 12 |
| 2 | ¿Por qué el agente ejecutó close-wp.sh al terminar Stage 12? | Porque infirió que "Stage 12 completo" equivale a "WP listo para cierre" |
| 3 | ¿Por qué el agente hizo esa inferencia? | Porque Stage 12 es el último stage y no hay un gate documentado que interrumpa esa inferencia con "espera instrucción humana" |
| 4 | ¿Por qué no existe ese gate en Stage 12? | Porque I-011 fue codificada como regla global en rules/, pero no fue integrada como paso explícito en el exit criteria de Stage 12 |
| 5 | ¿Por qué no fue integrada en Stage 12? | Porque I-011 fue escrita en este mismo WP: su latencia de adopción en el proceso de Stage 12 es de exactamente una sesión |

**Causa raíz accionable:** I-011 existe como invariante global pero no tiene enforcement local
en el exit criteria de Stage 12 STANDARDIZE. El cierre de WP es una acción que ocurre naturalmente
al final de Stage 12, pero el proceso de Stage 12 no incluye el paso de comprobación "¿tienes
orden explícita del ejecutor?".

---

## Acciones correctivas

| Prioridad | Causa raíz | Accion correctiva | Responsable | Plazo |
|-----------|-----------|-------------------|-------------|-------|
| 1 — critica | Stage 12 no tiene gate de instrucción humana | Agregar al exit criteria de `workflow-standardize/SKILL.md` y `thyrox/SKILL.md` el paso: "ANTES de ejecutar `close-wp.sh`: verificar que el ejecutor haya emitido instrucción explícita de cierre en la sesión activa. Si no existe, preguntar." | Framework (SKILL.md) | Inmediato (este WP) |
| 2 — alta | close-wp.sh sin confirmación | Agregar al script una comprobación: mostrar resumen del WP y solicitar confirmación antes de actualizar `now.md`. Alternativa: agregar un flag `--confirmed` que solo se pase cuando el agente tiene certeza de la orden. | Tooling (scripts/) | Corto plazo |
| 3 — alta | `closed_at:` en lessons-learned presupone cierre | Renombrar el campo a `session_completed_at:` o eliminarlo del template. El cierre del WP es un evento en `now.md`, no en el lessons-learned. | Template / metadata-standards | Corto plazo |
| 4 — media | I-011 no tiene enforcement en proceso Stage 12 | Agregar en `workflow-standardize/SKILL.md` un checklist de pre-condicion con I-011 como item: `[ ] El ejecutor ha emitido instrucción explícita de cierre (I-011)`. | SKILL.md workflow-standardize | Corto plazo |
| 5 — media | Modelo mental WP=tarea-única persiste | Agregar en el onboarding de Stage 1 DISCOVER una nota visible: "Este WP puede acumular N análisis y N task plans. El cierre es decisión del ejecutor, no consecuencia de Stage 12." | workflow-discover/SKILL.md | Mediano plazo |
| 6 — baja | Advertencia verbal del ejecutor no formalizada | Cuando el ejecutor exprese restricciones de comportamiento en conversación ("el WP puede tener N planes"), el agente debe preguntarle si quiere formalizarlo como nota en `now.md` o como instrucción en el WP. | Comportamiento del agente (práctica) | Mediano plazo |

---

## Síntesis

La causa raíz del cierre prematuro no es un fallo de comprensión de I-011 — el agente tenia acceso
a la regla. La causa es estructural: Stage 12 STANDARDIZE no incluye un paso que obligue al agente
a verificar la presencia de una orden explícita antes de ejecutar close-wp.sh. En ausencia de ese
gate, la inferencia "Stage 12 completo = WP cerrado" es localmente coherente y difícil de romper
solo con una regla global.

La acción de mayor impacto es modificar `workflow-standardize/SKILL.md` para incluir una
comprobación explícita antes del cierre: "¿tienes instrucción explícita del ejecutor?". Si la
respuesta es no, el agente debe preguntar en lugar de inferir. Esta modificación convierte I-011
de una regla declarativa en un paso de proceso verificable, eliminando la brecha entre la
invariante y su ejecución.

Un factor agravante fue que el campo `closed_at:` en el template de lessons-learned presupone
que el WP se cierra en la sesión actual — una señal semántica fuerte que refuerza la inferencia
del agente. Corregir ese campo elimina un vector de confusion adicional sin costo de proceso.

La lección de segundo orden es que las reglas de gobierno (I-011, L-128) tienen latencia de
adopción de al menos una sesión cuando son escritas en el mismo WP donde se viola la regla.
La solución no es solo escribir la regla — es integrarla en el proceso como comprobación activa.
```

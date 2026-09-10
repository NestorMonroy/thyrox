```yml
ID work package: 2026-04-04-07-17-37-skill-adr-boundary
Fecha cierre: 2026-04-04
Proyecto: THYROX — PM-THYROX Framework
Fase de origen: Phase 7 — TRACK
Total lecciones: 8
```

# Lessons Learned: skill-adr-boundary

## Lecciones

### L-030: Los flujos deben mostrar el camino de fallo, no solo el camino feliz

**Qué pasó**

Los primeros flujos de la solution strategy eran lineales: inicio -> proceso -> éxito.
No mostraban qué pasa cuando CLAUDE.md no se lee, cuando el SKILL no se activa,
o cuando el stop hook no existe en otro entorno.

**Raíz**

Al diseñar flujos, el instinto es describir el caso nominal. El caso de fallo
requiere un esfuerzo consciente adicional.

**Fix aplicado**

Flujos reescritos con mermaid flowchart TD mostrando ramas de fallo, loops de
retorno y la rama "consultar usuario" como salida legítima.

**Regla**

Cuando se diseña un flujo, diagramar primero qué pasa cuando cada paso falla,
luego conectar con el camino feliz. Un flujo sin ramas de error no es un flujo real.

---

### L-031: Mermaid es el estándar — no usar ASCII aunque parezca más rápido

**Qué pasó**

Se usó ASCII art para los flujos de la solution strategy a pesar de que el proyecto
ya usaba mermaid en SKILL.md, voltfactory-design y technical-debt strategy.

**Raíz**

El template `solution-strategy.md.template` no tiene ningún ejemplo de mermaid.
Sin referencia visual en el template, el comportamiento por defecto fue ASCII.

**Fix aplicado**

Flujos reescritos en mermaid. T-DT-006 registrado para actualizar el template.

**Regla**

Cuando el template no refleja una convención establecida en el proyecto, registrar
T-DT inmediatamente y seguir la convención del proyecto, no la del template.

---

### L-032: El template es la primera fuente de verdad — si diverge del proyecto, es deuda

**Qué pasó**

El template y la práctica real divergieron (mermaid en práctica, sin mermaid en template).
Esta divergencia se descubrió al ejecutar el WP, no al crearlo.

**Raíz**

Las convenciones se establecen en la práctica antes de formalizarse en templates.
El tiempo entre adopción y formalización es una ventana de deuda silenciosa.

**Fix aplicado**

T-DT-006 registrado en focus.md con prioridad baja.

**Regla**

Cuando se adopta una nueva convención en un WP, verificar si el template
correspondiente la refleja. Si no: registrar T-DT antes de cerrar el WP.

---

### L-033: Boundary statements van en CLAUDE.md primero, SKILL.md como refuerzo

**Qué pasó**

El análisis identificó que el boundary SKILL vs ADR debía estar en CLAUDE.md
porque es el primer archivo que lee cualquier modelo. Sin embargo, en el primer
borrador de la strategy solo se contemplaba SKILL.md.

**Raíz**

La tendencia natural es poner instrucciones en el SKILL porque es el motor.
CLAUDE.md como capa de boundary requiere pensar en el orden de lectura del modelo.

**Fix aplicado**

Solución de 3 capas: CLAUDE.md (boundary primario) + SKILL.md (trigger operacional)
+ adr.md.template (auto-descriptivo).

**Regla**

Cuando una regla es crítica para orientar al modelo desde el inicio de sesión,
ponerla en CLAUDE.md primero. SKILL.md es la capa de refuerzo operacional,
no el punto de entrada.

---

### L-034: Cada RC en Phase 2 debe tener tarea concreta en Phase 3, no solo mención narrativa

**Qué pasó**

Phase 2 declaró "CLAUDE.md resuelve RC-001 y RC-003". Phase 3 solo creó una tarea
para RC-001. RC-003 quedó sin tarea. Se detectó post-cierre del WP.

**Raíz**

Las tareas del plan se derivaron de "qué archivos toco", no de "qué RC resuelve
cada tarea". Sin tabla de trazabilidad, el gap era invisible.

**Fix aplicado**

RC-003 corregida con un commit adicional. L-034 documentada. Posteriormente,
SKILL.md Phase 3 recibió el gate de trazabilidad RC→tarea (SPEC-001).

**Regla**

Cuando el plan derive de un análisis con RC, construir la tabla trazabilidad RC→tarea
antes de presentar el plan al usuario. Si una RC de prioridad Alta o Media no tiene
fila en la tabla, agregar la tarea antes de continuar.

---

### L-035: "WP pequeño" no justifica saltar DECOMPOSE cuando hay RC con prioridades distintas

**Qué pasó**

El WP fue clasificado como "pequeño" (5 tareas, 3 archivos) y se saltaron Phase 4
y Phase 5. Pero el WP tenía 8 RC con prioridades distintas que debían mapearse.
Sin DECOMPOSE no hubo checklist de cobertura.

**Raíz**

La clasificación de tamaño usa un solo eje (duración/cantidad de tareas). No considera
si hay RC con prioridades distintas que requieran trazabilidad explícita.

**Fix aplicado**

SKILL.md Phase 3 recibió la Nota DECOMPOSE: "SI hay RC con prioridades distintas →
DECOMPOSE no puede saltarse independientemente del tamaño."

**Regla**

Cuando se clasifica un WP, verificar dos condiciones antes de saltar DECOMPOSE:
(1) duración/tamaño corto Y (2) sin RC con prioridades distintas. Si falla cualquiera,
DECOMPOSE es obligatorio.

---

### L-036: Las phases no se saltan porque el resultado parece obvio — se siguen porque el proceso descubre lo que no es obvio

**Qué pasó**

En la primera ejecución del WP, el modelo "sabía" qué archivos tocar antes de
ejecutar Phase 4 y Phase 5. Las phases se convirtieron en documentación de
decisiones ya tomadas, no en el proceso que genera las decisiones.

**Raíz**

La ilusión de que el resultado es obvio hace que las phases parezcan burocracia.
Pero Phase 5 (DECOMPOSE) es precisamente la que habría detectado el gap de RC-003
al construir la lista de tareas desde las RC hacia abajo.

**Fix aplicado**

Reapertura del WP y ejecución completa de las 7 phases respetando cada artefacto
y cada template. RC-003 y todos los hallazgos quedaron con cobertura completa.

**Regla**

Cuando el resultado parece obvio, es la señal de que el proceso es más necesario,
no menos. Las phases no añaden burocracia — añaden el espacio donde los gaps se
vuelven visibles antes de que se conviertan en errores.

---

### L-037: Reabrir un WP es válido — es mejor que un WP cerrado con trabajo incompleto

**Qué pasó**

El WP skill-adr-boundary se cerró en Phase 7 con RC-003 sin implementar.
En lugar de crear un nuevo WP, se reabrió el mismo WP y se ejecutaron las
7 phases correctamente para el nuevo scope (correcciones de proceso).

**Raíz**

No había precedente claro de cómo manejar un WP cerrado con trabajo pendiente.
La opción de reabrirlo no estaba documentada en el SKILL.

**Fix aplicado**

El WP se reabrió actualizando now.md y ejecutando las phases completas.

**Regla**

Cuando un WP cerrado tiene trabajo pendiente identificado en revisión post-cierre,
reabrirlo y ejecutar las phases necesarias es preferible a acumular el trabajo como
deuda técnica sin contexto. El WP es la unidad de trabajo — su historial vale más
que un cierre limpio apresurado.

---

## Patrones identificados

| Patrón | Lecciones | Acción sistémica |
|--------|-----------|-----------------|
| Adelantarse a las phases | L-034, L-035, L-036 | Gates en Phase 3 implementados (SPEC-001/002/003) |
| Template diverge de práctica | L-031, L-032 | T-DT-006 registrado para solution-strategy.md.template |
| Boundary en capa equivocada | L-033 | Regla SKILL vs ADR en CLAUDE.md como capa primaria |

---

## Qué replicar

- **Ejecución completa de 7 phases:** Cuando se respetaron todas las phases (reapertura),
  los gaps fueron detectados por el proceso antes de llegar al usuario.
- **Tabla de trazabilidad RC→tarea:** Hizo visible en Phase 3 qué hallazgos tenían cobertura.
- **Checklist SPEC con grep:** Criterios de aceptación verificables mecánicamente — sin ambigüedad.

---

## Deuda pendiente

| ID | Descripción | Prioridad | WP sugerido |
|----|-------------|-----------|-------------|
| T-DT-006 | solution-strategy.md.template sin sección de flujos ni ejemplo mermaid | Baja | skill-template-mermaid |
| T-DT-004 | False positives en grep sobre code-fence blocks en investigacion-referencias | Baja | — |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados
- [x] Deuda técnica registrada con prioridad
- [x] Documento en `work/.../skill-adr-boundary-lessons-learned.md`

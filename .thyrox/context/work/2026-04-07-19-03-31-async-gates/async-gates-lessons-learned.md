```yml
type: Lecciones Aprendidas
work_package: 2026-04-07-19-03-31-async-gates
created_at: 2026-04-08 19:03:31
status: Completado
phase: Phase 7 — TRACK
```

# Lecciones Aprendidas: async-gates

## Lecciones

### L-068 — task-notification no es autorización implícita de continuación

**Contexto:** La llegada de `<task-notification>` señalaba que un agente en background completó. Claude procesaba el resultado automáticamente y continuaba con la siguiente tarea sin parar.

**Lección:** `<task-notification>` es un trigger de gate, no una señal de auto-continuación. El usuario debe ver el resultado antes de que se use para tomar decisiones o lanzar el siguiente agente. Ausencia de respuesta ≠ aprobación.

**Aplicación:** Instrucción explícita en SKILL.md Phase 6: 6 pasos al recibir task-notification.

---

### L-069 — Phase 1 debe anticipar los stopping points del WP completo

**Contexto:** Los gates de fase estaban en SKILL.md pero no se instanciaban como plan concreto para cada WP. El usuario no sabía cuándo Claude iba a parar hasta que Claude paraba.

**Lección:** Phase 1 debe producir un Stopping Point Manifest — tabla de todos los puntos de parada esperados. Esto hace los gates predecibles y permite al usuario planificar su propio tiempo de revisión.

**Aplicación:** Paso 9 obligatorio en SKILL.md Phase 1.

---

### L-070 — El manifest debe registrarse antes de lanzar agentes, no después

**Contexto:** En el diseño inicial se consideró registrar SPs en Phase 6 al momento de lanzar cada agente. Pero esto no da visibilidad previa al usuario.

**Lección:** Los SP de agentes async deben registrarse en Phase 5 pre-flight, antes de lanzar el primer agente. El usuario debe poder ver el manifest completo antes de aprobar el task-plan (en el GATE HUMANO CRÍTICO de Phase 5).

**Aplicación:** Paso 5 en pre-flight Phase 6 de SKILL.md.

---

### L-071 — Calibrar gates evita fatiga de aprobación

**Contexto:** La propuesta inicial era gate igual para todos los agentes async. Esto generaría demasiadas interrupciones para agentes de solo lectura.

**Lección:** Los gates deben calibrarse por dos ejes: reversibilidad del WP × tipo de agente. Un agente Explore en un WP documentation requiere solo un gate ligero (mencionar + opción de objetar). Un task-executor en un WP reversible requiere gate fuerte.

**Aplicación:** Tabla de calibración en SKILL.md Phase 6.

---

### L-072 — Phase 2 orienta el scope pero Phase 3 lo declara

**Contexto:** Durante este WP el usuario preguntó: "¿el scope se define en Phase 2 o Phase 3?" — la distinción no era clara en SKILL.md.

**Lección:** Phase 2 toma decisiones arquitectónicas que *acotan* lo que puede entrar en scope, pero no declara formalmente qué entra y qué no. Eso es Phase 3. La nota metodológica en SKILL.md Phase 3 aclara esto para sesiones futuras.

**Aplicación:** Nota en Phase 3 de SKILL.md.

---

### L-073 — FASE (WP del proyecto) vs Phase (SDLC) generan confusión de nomenclatura

**Contexto:** El usuario preguntó "¿por qué existe la FASE 19 si estamos en la Phase 4?" — las dos nomenclaturas conviven en el mismo sistema con nombres similares.

**Lección:** El sistema usa dos jerarquías distintas: FASE N = work package del proyecto (número secuencial); Phase N = fase SDLC dentro de cada WP (1-7). Requiere un WP propio para aclarar naming y trazabilidad. Registrado como deuda técnica (no resuelto en este WP).

**Aplicación:** TD-004 y TD-005 en technical-debt.md. WP "context-hygiene" pendiente.

---

### L-074 — La validación pre-Phase 7 no debe depender del usuario

**Contexto:** Al terminar Phase 6, el task-plan tenía todos los checkboxes como `[ ]` aunque las tareas ya habían sido ejecutadas. El usuario tuvo que pedirle a Claude que revisara — la validación no ocurrió automáticamente.

**Lección:** Claude debe ejecutar una checklist de consistencia antes de proponer Phase 7, sin que el usuario lo solicite. Esta validación cubre: task-plan `[x]`, execution-log actualizado, ROADMAP checkboxes, Stopping Point Manifest. Si falla algún ítem, Claude corrige antes de avanzar.

**Aplicación:** Sección "Validación pre-Phase 7" añadida a SKILL.md Phase 6 como paso REQUERIDO.

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Fases completadas | 7/7 |
| Tareas en task-plan | 8 |
| Tareas completadas | 8 |
| Cambios en SKILL.md | 4 secciones (Phase 1 paso 9, Phase 3 nota, Phase 5 pre-flight paso 5, Phase 6 gate async + calibración) |
| Lecciones documentadas | L-068 a L-074 (7 lecciones) |
| Deuda técnica identificada | TD-004, TD-005 |
| Errores en ejecución | 0 |

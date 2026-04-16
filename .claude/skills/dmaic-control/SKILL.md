---
name: dmaic-control
description: "Use when sustaining improvements in a DMAIC project. dmaic:control — create Control Plan, update SOPs, configure ongoing monitoring, and transfer process ownership."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-control — DMAIC: Control

> *"An improvement that isn't sustained isn't an improvement — it's a temporary fix. Control is what separates DMAIC projects from firefighting."*

Ejecuta la fase **Control** de DMAIC. Sostiene las mejoras en el tiempo, transfiere la propiedad del proceso y cierra el proyecto formalmente.

**Tollgate:** Control Plan activo y proceso transferido al dueño del proceso antes de cerrar el proyecto.

---

## Cuándo usar este paso

- Cuando la mejora de Improve está validada estadísticamente
- Para asegurar que la mejora no se pierda con el tiempo
- Para transferir la responsabilidad del proceso del equipo del proyecto al dueño del proceso

## Cuándo NO usar este paso

- Sin validación de Improve — Control de una mejora no validada no tiene base
- Si el proceso está actualmente inestable (causas especiales activas) — estabilizar primero
- Sin dueño del proceso identificado — alguien específico debe hacerse responsable del proceso post-proyecto

---

## Actividades

### 1. Control Plan — el documento central de Control

El Control Plan define *exactamente* cómo se va a monitorear y mantener el proceso mejorado:

| Característica | Método de medición | Frecuencia | Quién | Límites de control | Acción ante desvío |
|---------------|-------------------|-----------|-------|-------------------|-------------------|
| [CTQ principal] | [Instrumento/sistema] | [Diaria/semanal] | [Rol/nombre] | [UCL / LCL] | [Procedimiento de respuesta] |
| [CTQs secundarios] | | | | | |
| [Variables críticas del proceso] | | | | | |

**Cada fila del Control Plan es un compromiso operacional — no un documento de referencia.**

### 2. SPC — Statistical Process Control

Para CTQs continuos críticos, implementar gráficas de control:

**Selección del tipo de gráfica:**

| Tipo de dato | Tamaño de subgrupo | Gráfica recomendada |
|-------------|-------------------|-------------------|
| Continuo | n = 1 (medición individual) | I-MR (Individuales y Rango Móvil) |
| Continuo | n = 2-9 (subgrupos pequeños) | X-bar / R |
| Continuo | n ≥ 10 (subgrupos grandes) | X-bar / S |
| Atributo — proporción defectuosa | Variable | p-chart |
| Atributo — defectos por unidad | Variable | u-chart |
| Conteo — defectos totales | n fijo | c-chart |

**Límites de control (UCL / LCL):**
- Calcular desde los datos de Improve (proceso mejorado), no del baseline
- UCL = Media + 3σ, LCL = Media − 3σ (para gráficas de Shewhart)
- Señal de alarma: punto fuera de límites, 8 puntos consecutivos del mismo lado de la media, tendencia de 6 puntos ascendentes o descendentes

### 3. Respuesta ante señales de alarma — Plan de reacción

Para cada señal de alarma, el Control Plan debe tener un procedimiento de respuesta claro:

| Señal | ¿Quién actúa? | ¿Qué hace primero? | ¿Cuándo escalar? |
|-------|--------------|-------------------|-----------------|
| Punto fuera de UCL/LCL | Operador | Verificar si es error de medición → si real, iniciar análisis de causa | Si no se identifica causa en 24h |
| Tendencia ascendente/descendente | Supervisor | Revisar variables de proceso | Si continúa después de corrección |
| Patrón cíclico | Ingeniero | Analizar factores temporales | Inmediatamente |

> Sin plan de reacción, las gráficas de control son decoración. El valor está en que alguien sabe *qué hacer* cuando aparece una señal.

### 4. Actualizar SOPs y documentación

Los procedimientos del proceso deben reflejar el nuevo método de trabajo:

| Documento | Qué actualizar |
|-----------|---------------|
| **SOP / procedimiento operativo** | Pasos nuevos del proceso, parámetros actualizados |
| **Especificaciones técnicas** | Límites de especificación si cambiaron |
| **Runbooks / playbooks** | Procedimientos de operación y mantenimiento |
| **Documentación de sistema** | Si hubo cambios en software, configuración, infraestructura |
| **CLAUDE.md / guidelines** (si aplica a SW) | Si el proyecto fue de software, actualizar convenciones del equipo |

### 5. Training — transferir conocimiento

El equipo del proyecto sabe por qué funciona el nuevo proceso. El dueño del proceso necesita saberlo también:

| Contenido del training | Audiencia |
|----------------------|-----------|
| El problema que se resolvió y por qué importa | Todos los operadores del proceso |
| El nuevo método de trabajo (SOP actualizado) | Operadores que ejecutan el proceso |
| Cómo leer y reaccionar a las gráficas de control | Supervisores y dueño del proceso |
| Plan de reacción ante desvíos | Supervisores |

### 6. Cierre formal del proyecto

El proyecto DMAIC se cierra cuando:
1. El Control Plan está activo y monitoreado
2. El dueño del proceso ha aceptado formalmente la responsabilidad
3. Los beneficios del proyecto están documentados vs el business case

**Documentar resultados finales:**

| Métrica | Baseline (Measure) | Post-Improve (piloto) | Resultado Control (estabilizado) | % Mejora |
|---------|-------------------|-----------------------|----------------------------------|---------|
| CTQ principal (Sigma Level) | | | | |
| Beneficio financiero realizado | | | | |

---

## Artefacto esperado

`{wp}/dmaic-control.md` — Estructura mínima:

```markdown
## Control Plan
[Tabla: característica, método, frecuencia, responsable, límites, acción ante desvío]

## Gráficas de control configuradas
[Qué tipo de gráfica, límites calculados, herramienta/sistema]

## Plan de reacción
[Señal → quién actúa → qué hace → cuándo escalar]

## SOPs actualizados
[Lista de documentos modificados con referencia]

## Training realizado
[Quién, cuándo, contenido]

## Transferencia al dueño del proceso
[Nombre del dueño, fecha de aceptación formal]

## Resultados finales del proyecto
[Tabla: baseline → resultado final → % mejora → beneficio realizado]

## Cierre formal
[Fecha de cierre, aprobación del sponsor]
```

---

## Red Flags — señales de Control mal ejecutado

- **Control Plan sin responsable nombrado** — "el equipo" no es un responsable; necesita un nombre
- **Sin límites de control calculados** — gráficas sin UCL/LCL no permiten detectar señales de alarma
- **Plan de reacción ausente** — una gráfica de control sin plan de reacción no genera ningún valor
- **SOPs no actualizados** — si los procedimientos siguen describiendo el proceso antiguo, el nuevo método se perderá cuando roten los operadores
- **Training no realizado antes de la transferencia** — el dueño del proceso necesita entender el nuevo método antes de asumir la responsabilidad
- **Proyecto cerrado antes de que los beneficios se estabilicen** — el tollgate de Control requiere datos del proceso *en control* con el nuevo método, no solo el piloto de Improve
- **Sin aceptación formal del dueño del proceso** — si el dueño no firma formalmente, no se hizo la transferencia real

---

## Estado en now.md

```
methodology_step: dmaic:control
flow: dmaic
```

## Siguiente paso

DMAIC completado. Iniciar Stage 11 TRACK/EVALUATE del WP → lecciones aprendidas y cierre formal del work package.

---

## Limitaciones

- Las gráficas de control SPC requieren herramientas específicas (Minitab, R, Python, Excel avanzado) — este skill guía qué configurar, no la implementación de la herramienta
- El monitoreo post-proyecto debe mantenerse mínimo 3-6 meses para confirmar que la mejora es sostenida; este skill cubre la configuración, no el monitoreo ongoing
- En procesos con alta complejidad regulatoria (FDA, ISO), los cambios a SOPs y documentación técnica pueden requerir aprobaciones adicionales fuera del scope del proyecto DMAIC

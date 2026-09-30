```yml
created_at: 2026-04-20 20:15:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
category: Calibration Pattern
applies_to: Agent tool invocations with bound-detector.py
```

# Patrón: Cuándo Preguntar Bound vs Cuándo Inferir

## Problema Original

**Situación:** Usuario pidió "ejecutes tus analisis en /.thyrox/context/work/2026-04-18-07-12-50-methodology-calibration/discover/*"

**Mi error:** Asumí unilateralmente "máximo 10 tool_uses" sin consultar al usuario.

**Punto de fallo:** Momento de lectura de instrucción → debería haber detectado ambigüedad de scope y preguntado ENTONCES, no después.

---

## Factores para Decidir: ¿Preguntar o Inferir?

### Factor 1: Señales de Ambigüedad en la Instrucción

**PREGUNTAR si:**
- Términos plurales sin límite explícito: "ejecutes tus analisis" (¿cuántos análisis? ¿todos?)
- Comodín con contenido desconocido: `discover/*` (¿cuántos archivos hay?)
- Verbos explorativos sin meta: "revisa", "analiza", "busca" (¿hasta dónde?)
- Ausencia de criterio de parada: "encuentra patrones" (¿cuántos patrones?)

**INFERIR si:**
- Instrucción con límite explícito: "revisa máximo 3 archivos"
- Nombre específico de archivo: "methodology-calibration-analysis.md" (1 archivo = bound implícito)
- Criterio de parada claro: "hasta encontrar X" o "los 5 más relevantes"
- Objetivo acotado: "busca referencias a CI/CD" (búsqueda específica = scope definido)

**En el caso original:** "ejecutes tus analisis en discover/*" = AMBIGUO → DEBERÍA HABER PREGUNTADO

---

### Factor 2: Contexto Temporal

**PREGUNTAR si:**
- Sesión abierta, tiempo disponible (usuario puede responder)
- Instrucción vaga que podría significar 15 min o 2 horas de análisis
- Riesgo: 10 tool_uses vs 100 tool_uses es diferencia material

**INFERIR si:**
- Usuario indicó urgencia: "rápidamente", "análisis veloz"
- Usuario dijo "brevemente" o "suma"
- Contexto de sesión al cierre (última instrucción)

**En el caso original:** Sesión abierta, tiempo disponible → DEBERÍA HABER PREGUNTADO

---

### Factor 3: Cantidad de Artefactos en Scope

**PREGUNTAR si:**
- Scope contiene >10 archivos (desconocido de antemano)
- Scope apunta a directorio entero sin filtro (discover/* = 100+ archivos)
- Operación es N-ésima sobre múltiples artefactos

**INFERIR si:**
- Scope es específico: "revisa este archivo"
- Cantidad es pequeña: 1-3 archivos nombrados
- Operación es 1-a-1 (archivo A → análisis)

**En el caso original:** discover/* = ~100 archivos → DEBERÍA HABER PREGUNTADO

---

### Factor 4: Complejidad de la Tarea

**PREGUNTAR si:**
- Tarea requiere análisis adversarial (deep-dive, deep-review)
- Resultado afecta decisiones críticas
- Hay múltiples dimensiones de análisis (verdad/falso/incierto × 5 preguntas)
- Confianza requerida es media/alta

**INFERIR si:**
- Tarea es búsqueda simple: "encuentra dónde se define X"
- Tarea es lectura: "lee este archivo"
- Resultado es informativo (no decisional)

**En el caso original:** deep-dive adversarial × 5 preguntas = COMPLEJA → DEBERÍA HABER PREGUNTADO

---

## Matriz de Decisión

| Señal | Ambigüedad | Contexto | Artefactos | Complejidad | Decisión |
|-------|-----------|----------|-----------|------------|----------|
| Plural sin límite | ✓ ambiguo | abierto | >10 | alta | **PREGUNTAR** |
| Nombre específico | ✗ claro | cualquiera | 1-3 | baja | **INFERIR** |
| Criterio claro | ✗ claro | cualquiera | variable | variable | **INFERIR** |
| Comodín sin filtro | ✓ ambiguo | abierto | >10 | variable | **PREGUNTAR** |
| Urgencia indicada | variable | cerrado | variable | variable | **INFERIR** (bound temporal) |
| Exploratorio vago | ✓ ambiguo | abierto | desconocido | variable | **PREGUNTAR** |

**Caso original:** 5/6 señales apuntaban a PREGUNTAR → debería haber preguntado

---

## Cuándo la Respuesta ESTÁ IMPLÍCITA

**Caso 1: Límite temporal es implícito por contexto**
```
Ejemplo: "rápidamente revisa si hay referencias a CI/CD"
Implícito: máximo 5-10 minutos de análisis
Puedo inferir: bound = "tiempo disponible en sesión actual"
```

**Caso 2: Objetivo define el scope**
```
Ejemplo: "busca la única referencia a stop-hooks en THYROX"
Implícito: búsqueda específica de 1 elemento = scope acotado
Puedo inferir: "hasta encontrar 1 resultado"
```

**Caso 3: Cantidad es naturalmente pequeña**
```
Ejemplo: "compara estos 2 archivos" (nombrados explícitamente)
Implícito: 1 comparación = scope claro
Puedo inferir: máximo 2 archivos
```

**Caso 4: Análisis es superficial por definición**
```
Ejemplo: "¿existe el archivo X?"
Implícito: búsqueda binaria = 1 respuesta, no exploración
Puedo inferir: máximo 3 tool_uses
```

**Caso 5: Contexto histórico de sesión**
```
Ejemplo: (después de haber analizado 5 WPs) "analiza el siguiente"
Implícito: patrón establecido = máximo 5-6 preguntas como en iteración anterior
Puedo inferir: bound = "mismo scope que iteración previa"
```

---

## Momento Correcto para PREGUNTAR

**Debería haber preguntado cuando:**

1. **Detecté ambigüedad en instrucción**
   - Punto: Lectura inicial de "ejecutes tus analisis en discover/*"
   - Acción: Señalar que `discover/*` es ambiguo (100+ archivos)
   - Pregunta: "¿Quieres que revise TODOS los archivos o solo específicos? ¿Hay un límite?"

2. **Antes de invocar Agent con instrucción sin bound**
   - Punto: Antes del primer Agent call
   - Acción: Reconocer que bound-detector.py bloqueará si no tiene límite
   - Pregunta: "Para ejecutar deep-dive sobre las 5 preguntas, necesito un bound claro. Opciones: máximo N archivos / máximo N tool_uses / máximo confianza MEDIA. ¿Cuál prefieres?"

3. **Como respuesta a bound-detector.py**
   - Punto: Al recibir el bloqueo del hook
   - Acción: Reconocer que el hook está siendo correcto
   - NO hacer: Asumir unilateralmente un límite
   - SÍ hacer: Preguntar al usuario qué bound quiere

---

## Guía para Implementación Futura

### Checklist antes de invocar Agent:

```
¿Tiene la instrucción estas propiedades?

□ Instrucción contiene términos ambiguos (todos, cada, cualquier, analiza, revisa sin meta)
□ Scope apunta a múltiples artefactos (directorio, comodín) sin límite explícito
□ Artefactos en scope > 10 archivos
□ Tarea es compleja (adversarial, análisis de múltiples dimensiones)
□ No hay criterio de parada claro

Si ≥3 cajas están marcadas → PREGUNTAR BOUND
Si ≤1 caja está marcada → PUEDO INFERIR
```

### Pregunta a hacer:

```
"Para [tarea], necesito aclarar el scope:

Opciones:
A) Máximo N archivos a revisar
B) Máximo N herramientas / búsquedas
C) Parar cuando confianza sea [Media/Alta]
D) Solo estos específicos: [lista]
E) Otro: [especifica]

¿Cuál prefieres?"
```

---

## Aplicación al Caso Concreto

**Debería haber preguntado en este momento:**

Cuando usuario pidió: "ejecutes tus analisis en /.thyrox/context/work/2026-04-18-07-12-50-methodology-calibration/discover/*"

**Pregunta correcta:**

```
"El directorio discover/ contiene ~100 archivos. ¿Quieres que ejecute deep-dive y deep-review:

A) Solo sobre los 5 archivos clave (ej: methodology-calibration-analysis.md + patrones principales)
B) Máximo 20 archivos relevantes a CI/CD
C) Máximo 10 tool_uses (búsquedas limitadas)
D) Hasta alcanzar confianza MEDIA en hallazgos
E) Otro scope: [especifica]

¿Cuál prefieres?"
```

**Lo que sucedió en realidad:**
- Asumí "máximo 10 tool_uses" unilateralmente
- No consulté
- Resultó en análisis válido pero no negociado

---

## Lección Aprendida

**No es:** "El modelo debe SIEMPRE preguntar"

**Es:** "El modelo debe RECONOCER cuando ambigüedad existe y NEGOCIAR scope con usuario, porque:
- El usuario conoce sus necesidades reales
- El scope afecta confianza, profundidad, tiempo
- La calibración correcta es colaborativa, no unilateral"

**Aplicación futura:** Cuando detecte Factor 1 (ambigüedad) + Factor 3 (>10 artefactos), parar y PREGUNTAR antes de invocar agentes.


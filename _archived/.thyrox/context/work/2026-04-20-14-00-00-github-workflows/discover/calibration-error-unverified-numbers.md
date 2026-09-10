```yml
created_at: 2026-04-20 20:30:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
severity: CRÍTICA
category: Calibration Error — Numbers Without Verification
```

# Error de Calibración: Nunca Asumir Números

## El Error Cometido

**Momento:** Cuando pregunté sobre el scope de análisis en methodology-calibration/discover/

**Lo que dije:** "El directorio `discover/` contiene ~100 archivos"

**La realidad:** 93 archivos (verificado con `find ... | wc -l`)

**Diferencia:** 7 archivos (7% de error)

**Por qué es grave:** El usuario toma decisiones basado en números que doy. Si digo "~100" y luego resulta que son 50, o 200, mis estimaciones de scope/tiempo/esfuerzo son **completamente no confiables**.

---

## Análisis de Impacto

### Dónde Falla la Calibración

1. **Scope estimation:** Usuario piensa "100 archivos = debo poner un bound fuerte" → pero si en realidad fuera 50, hubiera podido ser más generoso. Vice versa.

2. **Time estimation:** Usuario evalúa "15 minutos para 100 archivos" → pero si son 93, técnicamente son 14 minutos. Si fueran 200, sería 30 minutos. La cifra imprecisa hace todo impreciso.

3. **Confianza en números futuros:** Una vez que doy un número sin verificar y el usuario lo descubre, **pierde confianza en TODOS mis números posteriores** — incluso los correctos.

4. **Decisiones en cascada:** Si yo digo "93 archivos" pero el usuario confía basado en que verifiqué realmente, y toma decisiones derivadas, cualquier discrepancia se propaga.

---

## Regla Permanente: NUNCA ASUMIR NÚMEROS

### Cuando un número o cifra salga de mi boca, DEBE SER:

1. **VERIFICADO:** Contado, consultado, o extraído de fuente verificable
2. **EXPLÍCITO EN ORIGEN:** Debo indicar cómo lo sé
3. **EXACTO:** No aproximaciones (~100) si puedo contar (93)
4. **CON MARGEN:** Si no puedo verificar, decir "desconocido, necesito contar" — NO asumir

---

## Protocolo: Cómo Manejar Números de Aquí en Adelante

### Caso 1: Cifras sobre archivos / cantidad de elementos

**ANTES (INCORRECTO):**
```
"El directorio discover/ contiene ~100 archivos"
→ Asumido, no verificado
```

**DESPUÉS (CORRECTO):**
```
find .thyrox/context/work/.../discover -type f -name "*.md" | wc -l
→ Verificar antes de decir el número
→ "El directorio discover/ contiene 93 archivos .md"
→ Explicar que verifiqué con find+wc -l
```

### Caso 2: Cifras sobre líneas / tamaño de archivo

**ANTES (INCORRECTO):**
```
"validate.yml tiene ~70 líneas"
```

**DESPUÉS (CORRECTO):**
```
wc -l .github/workflows/validate.yml
→ "validate.yml tiene 70 líneas exactas"
```

### Caso 3: Cifras sobre commits / histórico

**ANTES (INCORRECTO):**
```
"Ha habido aproximadamente 5-10 intentos de expandir CI/CD"
```

**DESPUÉS (CORRECTO):**
```
git log --all --grep="workflow\|ci" --oneline | wc -l
→ "He encontrado N commits relacionados a workflow/ci"
→ Listar explícitamente cuáles son para verificación
```

### Caso 4: Cifras sobre tiempo / esfuerzo

**ANTES (INCORRECTO):**
```
"Esto tomará aproximadamente 15 minutos"
```

**DESPUÉS (CORRECTO):**
```
"Esto tomará aproximadamente 15 minutos, basado en:
- Máximo 10 tool_uses (verificable, cuenta regresiva)
- Máximo 5 archivos a leer (específico, no aproximado)
→ Si toma más, te aviso"
```

---

## Checklist Antes de Dar Cualquier Número

Antes de mencionar una cifra, preguntar:

```
□ ¿Es este número observable/verificable en el repo?
  → Sí: ejecutar comando de verificación
  → No: no puedo darlo como cifra exacta

□ ¿Viene de medición directa (wc -l, git log | wc -l, find | wc -l)?
  → Sí: exacto, puedo darlo
  → No: es aproximación, debo indicarlo explícitamente

□ ¿Hay margen de error conocido?
  → Sí: "entre 90 y 95 archivos (rango conocido)"
  → No: "93 archivos (exacto)"

□ ¿Puedo explicar cómo obtuve el número?
  → Sí: "Verifiqué con find ... | wc -l"
  → No: no debería darlo como cifra
```

---

## Aplicación al Caso Concreto

**Error:** "El directorio discover/ contiene ~100 archivos"

**Corrección:**
```bash
find .thyrox/context/work/2026-04-18-07-12-50-methodology-calibration/discover -type f -name "*.md" | wc -l
→ Resultado: 93

Ahora puedo decir con precisión:
"El directorio discover/ contiene exactamente 93 archivos .md"
"Verifiqué contando con find + wc -l"
```

---

## Regla para Futuras Estimaciones

Cuando deba estimar tiempo/esfuerzo:

**NO:**
```
"Esto tomaría ~15 minutos para 100 archivos"
→ Basado en suposición no verificada
```

**SÍ:**
```
"Esto tomaría ~15 minutos DADO que:
- Máximo 5 archivos específicos (verificado con búsqueda keyword)
- Máximo 15 tool_uses (bound claro, accionable)
- Confianza esperada: MEDIA (calibrada a esos límites)"
→ Los números son verificables o están explícitamente acotados
```

---

## Impacto en Calibración Futura

Esta regla afecta directamente a:

1. **bound-detector.py:** Cuando doy números en instrucciones a agentes, deben ser verificados
2. **Estimaciones de scope:** Basadas en cifras reales, no aproximaciones
3. **Decisiones de investigación:** Si digo "93 archivos pero 5 son clave", debo verificar cuáles son los 5
4. **Confianza en mis propuestas:** Si mis números fallan, todo falla

---

## De Aquí en Adelante

**Promesa de calibración:**
- Nunca dare un número sin verificarlo
- Si no puedo verificar, diré "desconocido, necesito contar"
- Explicitaré el método de verificación (find, wc -l, grep, git log, etc.)
- Si hay margen de error, lo indicaré explícitamente
- Los números que salgan de mi boca serán **confiables**


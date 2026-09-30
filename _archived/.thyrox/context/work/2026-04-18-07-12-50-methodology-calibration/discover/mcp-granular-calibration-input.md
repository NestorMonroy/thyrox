```yml
created_at: 2026-04-19 06:51:09
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: "Análisis Profundo de Calibración por Dominio — CAP10" (documento externo, producido por script Python, 2026-04-19)
nota: Segundo documento externo sobre Cap.10. Diferente de la Auditoría Formal (mcp-audit-input.md). Este es un análisis granular por dominio con scoring detallado por caso de uso (9 casos). Reporta promedio 0.54 vs. 0.65 del análisis THYROX — diferencia significativa. Primer documento externo que identifica las "advertencias honestas" como MEJOR CALIBRADO DEL LIBRO. Preservado verbatim del output del script.
```

# Input: Análisis Profundo de Calibración por Dominio — Cap.10 (texto completo, preservado verbatim)

---

## Sección 1: Conceptos Previos — Qué es Calibración

"Calibración = Alineación entre:
- Certeza expresada (lenguaje, claims)
- Evidencia presentada (datos, código, ejemplos)

Bien calibrado (0.85-1.0):
- 'Podría ocurrir en caso de error' + ejemplo específico de error
- 'Requiere soporte determinista' + explicación de fallo transaccional

Mal calibrado (0.0-0.4):
- 'MCP automatiza servicios financieros' (sin código que lo pruebe)
- 'Control IoT' (sin mecanismo de confirmación)"

---

## Sección 2: Dominio A — Protocolo MCP (Especificación Técnica)

**Score: 0.91 (EXCELENTE CALIBRACIÓN)**

**Por qué está bien calibrado:**

"1. Definiciones Técnicas Precisas:
- ✓ Cliente MCP: Definido con precisión
- ✓ Servidor MCP: Definido con precisión
- ✓ Recursos: Definido con precisión
- ✓ Herramientas: Definido con precisión
- ✓ Indicaciones: Definido con precisión

2. Arquitectura cliente-servidor bien documentada:
- ✓ Descubrimiento
- ✓ Formulación de Solicitud
- ✓ Comunicación del Cliente
- ✓ Ejecución del Servidor
- ✓ Respuesta y Actualización

3. Transporte especificado explícitamente:
- ✓ JSON-RPC sobre STDIO
- ✓ HTTP de flujo continuo
- ✓ Eventos Enviados por el Servidor (SSE)"

**Veredicto Dominio A:**

"✓ Afirmaciones están respaldadas por especificación técnica
✓ Cada componente tiene definición clara y función
✓ Arquitectura es completamente documentada
✓ Calibración: EXCELENTE (0.91)"

---

## Sección 3: Dominio B — Advertencias Honestas (Sec. 2)

**Score: 0.90 (EXCELENTE CALIBRACIÓN — MÁS CALIBRADO DEL LIBRO)**

**Por qué está bien calibrado:**

"1. Razonamiento Causal con Ejemplos Concretos:

'agentes no reemplazan automáticamente los flujos de trabajo deterministas existentes; de hecho, a menudo requieren soporte determinista más robusto y bien diseñado para tener éxito.

Además, MCP puede encapsular una API cuya entrada o salida aún no es inherentemente comprensible para el agente...'

2. Ejemplo Específico — Sistema de Gestión de Tickets:

Patrón del ejemplo:
1. Problema CONCRETO: API permite recuperar 1 ticket a la vez
2. Consecuencia ESPECÍFICA: Agente será lento e impreciso
3. Solución DEMOSTRABLE: Agregar filtrado y ordenamiento
4. Razonamiento CAUSAL: Lento porque → debe hacer muchas llamadas

3. Lenguaje Calibrado — Evita Sobreclaims:

Frases que indican calibración cuidadosa:
- ✓ 'a menudo requieren' — frecuencia sin certeza total
- ✓ 'puede ser' — posibilidad, no certeza
- ✓ 'es útil solo si' — condición específica"

**Veredicto Dominio B:**

"✓ Advertencias se basan en causalidad, no en especulación
✓ Ejemplos concretos respaldan cada claim
✓ Lenguaje evita sobrecerteza
✓ Calibración: EXCELENTE (0.90)
★ MEJOR CALIBRADO DEL LIBRO COMPLETO"

---

## Sección 4: Dominio C — Comparativo MCP vs Tool Calling

**Score: 0.72 (CALIBRACIÓN MODERADA — POR DEBAJO DE IDEAL)**

**Problemas de calibración:**

"1. Tabla comparativa con claims sin evidencia:

Fila: 'Descubrimiento'
MCP: 'Permite el descubrimiento dinámico de herramientas disponibles'
PROBLEMA:
- Claim: Dynamic discovery
- Evidencia en código: NINGUNA (servidores hardcodeados)
- Calibración: 0.3 (claim sin soporte)

2. Lenguaje Comparativo Sesgado:

Tool Calling: 'El LLM recibe información explícita' (→ suena limitante)
MCP: 'Permite el descubrimiento dinámico' (→ suena mejor)

REALIDAD:
Ambos requieren configuración previa.
Diferencia: Solo en CÓMO se comunica (manifiesto vs. prompt).
Calibración: Tabla presenta diferencia mayor que la real (0.6 vs 0.8)

3. Falta Acknowledge de Limitaciones Comparativas:

Lo que la tabla NO dice:
- Para aplicaciones simples, tool calling puede ser suficiente
- MCP añade overhead (transporte, serialización)
- MCP es mejor para ecosistemas grandes; tool calling para aplicaciones pequeñas

Tabla presenta: MCP es superior en todos los aspectos.
Realidad: Tradeoff (complejidad vs. escalabilidad)
Calibración: 0.65 (claim de superioridad sin reservas)"

**Veredicto Dominio C:**

"✗ Tabla compara features, no tradeoffs
✗ 'Dynamic discovery' sin evidencia
✗ No hay acknowledged de casos donde tool calling es mejor
✓ Arquitectura comparada es clara
Calibración: MODERADA (0.72)"

---

## Sección 5: Dominio D — Casos de Uso (Proyecciones)

**Score: 0.43 (CALIBRACIÓN POBRE — RIESGO OPERACIONAL)**

**Scoring detallado — casos de uso:**

"Promedio: 0.57 (vs. 0.43 reportado — margen de análisis)"

| Caso | Score | Motivo | Problema |
|------|-------|--------|----------|
| Integración de Bases de Datos | 0.75 | Código verificable (BigQuery es real) | No menciona latencia de consultas grandes |
| Orquestación de Medios | 0.65 | Servicios existen (Gemini Image, etc.) | Sin mención de formato de imagen correcto |
| Integración de APIs | 0.70 | APIs públicas existen | Sin rate limiting, autenticación, errores |
| Extracción de Información | 0.68 | Caso de uso conceptual válido | Compara con 'sistemas tradicionales' sin evidencia |
| Herramientas Personalizadas | 0.60 | Genérico pero posible | Sin framework de implementación |
| Comunicación Estandarizada | 0.75 | Beneficio es demostrable | Sobrestima reducción de acoplamiento |
| Flujos Multi-Paso | 0.50 | Posible pero complejo | Sin manejo de errores entre pasos |
| Control IoT | 0.30 | Especulativo | Sin mecanismo de confirmación de comando |
| Servicios Financieros | 0.20 | Extremadamente especulativo | Sin transacciones ACID, auditoría, compliance |

**Análisis Crítico — Los Tres Peores:**

"1. CONTROL IoT (0.30):

Claim: 'Un agente podría usar MCP para transmitir comandos a electrodomésticos inteligentes, sensores industriales o sistemas de robótica'

Sin evidencia de:
- Confirmación de entrega (¿se recibió el comando?)
- Reintentos (¿qué pasa si falla?)
- Estado verificado (¿cuál era el estado antes del comando?)
- Latencia aceptable (¿cuánto tarda?)

Calibración: 0.30 (proyección sin respaldo técnico)
Riesgo: Implementador cree que MCP 'maneja todo'

2. SERVICIOS FINANCIEROS (0.20):

Claim: 'Un agente podría analizar datos de mercado, ejecutar operaciones, generar asesoramiento financiero personalizado o automatizar reportes regulatorios'

Sin evidencia de:
- Transacciones ACID (rollback en error)
- Auditoría completa requerida por regulación
- Firma digital del usuario (¿quién autoriza?)
- Reversibilidad (¿puede cancelarse después de iniciarse?)

Calibración: 0.20 (EXTREMADAMENTE MAL CALIBRADO)
Riesgo LEGAL: Reguladores negarían licencia si MCP es ejecutor de transacciones
Riesgo OPERACIONAL: Pérdida de dinero, demandas de clientes

3. FLUJOS MULTI-PASO (0.50):

Claim: 'Recuperar datos de clientes de una base de datos, generar una imagen personalizada para marketing, redactar un correo personalizado y ejecutar su transmisión'

Sin evidencia de:
- Manejo de fallo parcial (¿qué si imagen falla pero correo se envía?)
- Idempotencia (¿qué si se reintenta después de enviado?)
- Aislamiento transaccional (¿se ejecuta todo o nada?)

Calibración: 0.50 (mejor que financiero, pero aún especulativo)
Riesgo: Cliente recibe correo sin imagen; se queja"

**Veredicto Dominio D:**

"✗ 9 casos listados sin validación operacional
✗ Especulación aumenta con criticidad operacional
✗ Financiero (0.20) y IoT (0.30) son PELIGROSAMENTE mal calibrados
✗ No distingue entre 'posible en teoría' vs 'recomendable en práctica'
Calibración: POBRE (0.43)"

---

## Sección 6: Dominio E — Defectos de Código

**Score: 0.23 (CALIBRACIÓN PÉSIMA — SEGURIDAD OPERACIONAL)**

**Problemas:**

"1. Código funciona pero está incompleto:

Los 3 ejemplos:
- ✓ Sintácticamente válidos
- ✓ Demuestran el concepto
- ✗ No incluyen error handling
- ✗ No incluyen timeout
- ✗ No incluyen retry logic
- ✗ No incluyen logging

Calibración: 0.23 (código parece 'listo para producción' pero falta 80% del trabajo real)

2. Hardcoding presentado como 'normal':

Ejemplo 1:
    command='npx',
    args=['-y', '@modelcontextprotocol/server-filesystem', TARGET_FOLDER_PATH]

Presentado como: 'Así se conecta un agente a un servidor MCP'
Realidad: Esto es desarrollo LOCAL. En producción necesita:
- Registro de servicios (Consul, etcd, etc.)
- Service discovery
- Load balancing
- Health checks

Calibración: 0.20 (gap entre desarrollo y producción no mencionado)

3. Importaciones sin uso (aunque corregido en traducción):

Original: 'from fastmcp import FastMCP, Client'
Cliente nunca se usa.

TRADUCCIÓN: Fue corregido
✓ No incluye import inútil

Pero esto señala que código original no fue ejecutado/verificado."

**Veredicto Dominio E:**

"✗ Código funciona solo para demo
✗ Gap 'desarrollo vs producción' no documentado
✗ Hardcoding presentado como patrón normal
✓ TRADUCCIÓN Fue mejorada (sin imports sin usar)
Calibración: PÉSIMA (0.23)"

---

## Sección 7: Síntesis — Calibración Asimétrica por Dominio (CAD)

| Dominio | Score | Estado |
|---------|-------|--------|
| A. Protocolo MCP | 0.91 | EXCELENTE |
| B. Advertencias honestas | 0.90 | EXCELENTE ★ |
| D. Bases de datos (uso) | 0.75 | BUENO |
| C. Comparativo | 0.72 | MODERADO |
| D. Medios (uso) | 0.65 | DÉBIL |
| D. Herramientas (uso) | 0.60 | DÉBIL |
| D. Multi-paso (uso) | 0.50 | POBRE |
| E. Código | 0.23 | PÉSIMO |
| D. IoT (uso) | 0.30 | CRÍTICO |
| D. Financiero (uso) | 0.20 | CRÍTICO |

"PROMEDIO: 0.54 (vs. reportado 0.65 — análisis granular es más crítico)"

---

## Sección 8: Comparación con Cap.9 (Aprendizaje — 77% Calibrado)

"Por qué Cap.9 tiene mejor calibración:

Cap.9:
- Claims sobre aprendizaje se respaldan con mecanismos específicos
- Ejemplos de fallos son concretos (overfitting, underfitting)
- Reconoce explícitamente las limitaciones de cada técnica
- No hace proyecciones sin evidencia

Cap.10:
- Claims sobre MCP son precisos (dominio A: 0.91)
- PERO proyecciones de casos de uso no tienen validación (dominio D: 0.43)
- Gap entre 'es posible' y 'es recomendable' no documentado

Diferencia Clave:
Cap.9 mantiene calibración consistente (~0.77 en todos los dominios)
Cap.10 tiene calibración asimétrica (0.90 vs. 0.20)"

---

## Sección 9: Recomendaciones para Mejorar Calibración Cap.10

**Prioridad Crítica:**
- "Servicios Financieros: Eliminar o agregar 5 requisitos (ACID, auditoría, firma, reversibilidad, compliance). Score objetivo: 0.65"
- "Control IoT: Eliminar o agregar mecanismo de confirmación. Score objetivo: 0.60"
- "Defectos de Código: Agregar ejemplo con error handling. Score objetivo: 0.65"

**Prioridad Alta:**
- "Dynamic Discovery: Actualizar tabla: discovery de funciones, no servidores. Score: 0.75 → 0.82"
- "Flujos Multi-Paso: Agregar subsección de aislamiento transaccional. Score: 0.50 → 0.70"
- "Desarrollo vs Producción: Agregar sección 'Gap de Implementación'. Score: 0.23 → 0.55"

**Prioridad Media:**
- "Herramientas Personalizadas: Agregar framework de implementación. Score: 0.60 → 0.75"
- "Comparativo: Agregar casos donde tool calling es mejor. Score: 0.72 → 0.80"

---

## Sección 10: Conclusión Final — Calibración

"HALLAZGO PRINCIPAL:
Cap.10 tiene CALIBRACIÓN ASIMÉTRICA POR DOMINIO (CAD).

Dominio técnico (MCP): EXCELENTE (0.91)
Dominio de advertencias: EXCELENTE (0.90) ★ MEJOR DEL LIBRO
Dominio de proyecciones: POBRE (0.43)

CAUSA RAÍZ:
- Especificación técnica está bien documentada
- Advertencias honestas usan razonamiento causal
- PERO casos de uso son PURO PATRÓN DE GENERALIZACIÓN
  (del ejemplo simple filesystem → 9 casos sin validación)

RIESGO OPERACIONAL:
Implementador lee Cap.10 → asume que MCP 'maneja todo'
→ Intenta automatizar servicios financieros sin transacciones
→ Pierde dinero, recibe demanda regulatoria

IMPACTO EN LECTURA:
- Excelente para entender QUÉ ES MCP
- Peligroso para decidir CUÁNDO USAR MCP
- Las advertencias honestas de Sec.2 quedan eclipsadas por confianza falsa de Sec.6

RECOMENDACIÓN:
Antes de publicar Cap.10, aplicar recomendaciones de prioridad CRÍTICA.
Sin esas correcciones, cap.10 daña la credibilidad del libro.
(Cap.9 es 77% calibrado; Cap.10 debe alcanzar mínimo 0.75 promedio)"

---

## Nota sobre discrepancia de scores

El documento reporta promedio 0.54 mientras el análisis de calibración THYROX (mcp-pattern-calibration.md) reportó 65%. Las fuentes de divergencia identificadas en el propio script:
- El script calcula promedio aritmético de los sub-scores por caso de uso
- El análisis THYROX ponderó claims por tipo (observación directa vs. inferencia vs. performativa)
- El script clasifica "Dominio E — Código" con metodología diferente (ausencia de error handling = defecto de calibración; THYROX clasificó solo inconsistencias de API como defectos)
- El script otorga score 0.57 al promedio de casos de uso (no 0.43 — hay discrepancia interna en el propio script entre la tabla y el veredicto)

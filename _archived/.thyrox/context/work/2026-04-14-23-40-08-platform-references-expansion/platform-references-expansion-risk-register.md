```yml
type: Risk Register
created_at: 2026-04-14 23:40:08
wp: platform-references-expansion
fase: FASE 37
status: active
```

# Risk Register — platform-references-expansion

| ID | Riesgo | P | I | Score | Mitigación | Estado |
|----|--------|---|---|-------|-----------|--------|
| R-1 | Fuentes en /tmp/ desaparecen antes de completar todos los archivos | B | A | 3 | Priorizar ejecución continua; no diferir en sesiones | Abierto |
| R-2 | Scope creep (incluir gaps medios en FASE 37) | M | M | 4 | Scope guard explícito: solo los 10 items de impacto alto | Abierto |
| R-3 | Inconsistencia de formato vs referencias existentes | B | M | 2 | Leer una referencia existente como muestra antes de cada Write | Abierto |
| R-4 | Duplicación de contenido con referencias existentes | B | M | 2 | Verificar cobertura exacta de cada gap antes de escribir | Abierto |

P = Probabilidad (A=Alta, M=Media, B=Baja) · I = Impacto (A=Alto, M=Medio, B=Bajo)
Score = P×I (1=bajo, 9=crítico)

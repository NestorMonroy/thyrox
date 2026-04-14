```yml
type: Índice de Patrones
version: 1.0
created_at: 2026-04-14 20:34:23
updated_at: 2026-04-14 20:40:00
```

# Patrones — Índice Global

Soluciones que funcionaron y se repiten. Un patrón se formaliza cuando
ha sido aplicado ≥2 veces o cuando tiene impacto estratégico en el proyecto.

---

## Índice

| Archivo | Nombre | Problema que resuelve | Fecha |
|---------|--------|-----------------------|-------|
| [validate-wire-test](validate-wire-test.md) | Validate-Wire-Test | Script creado sin conectar al sistema | 2026-04-14 |
| [bound-explicito-agente](bound-explicito-agente.md) | Bound Explícito en Agentes | Instrucciones ilimitadas causan timeouts | 2026-04-14 |
| [git-mv-migracion](git-mv-migracion.md) | git mv para Migraciones | Mover archivos sin perder historial | 2026-04-14 |

---

## Cómo Promover un Patrón

Un patrón se crea cuando:
1. Una solución funcionó bien y podría aplicarse en futuros WPs
2. Se repitió ≥2 veces en distintos contextos
3. Es lo suficientemente específico para ser accionable (no "escribir buen código")

### Template de Patrón

```markdown
---
id: P-NNN
nombre: Nombre descriptivo del patrón
problema: Una frase del problema que resuelve
categoria: [Infraestructura|Agentes|Git|Migración|Referencias|Metodología]
origen: FASE N o múltiples FASEs
fecha: YYYY-MM-DD
---

## Problema
Descripción del problema que ocurre sin este patrón.

## Solución (el Patrón)
Descripción concisa de la solución.

## Implementación
Pasos concretos o código de ejemplo.

## Cuándo Aplicar
Condiciones que indican que este patrón es relevante.

## Cuándo NO Aplicar
Excepciones o casos donde el patrón no aplica.

## Referencias
- Lección origen
- Commits relevantes
```

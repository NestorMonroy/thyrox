```yml
created_at: 2026-06-03T02:13:59
project: THYROX
work_package: 2026-06-03-02-13-59-cosmic-sizing
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# DISCOVER — COSMIC sizing (skill THYROX + piloto e-comerce)

## Problema / objetivo

THYROX no tiene capacidad de **dimensionamiento funcional**. Objetivo: construir un skill
COSMIC (ISO/IEC 19761) para la fase MEASURE/BASELINE, y validarlo con el **buy-flow de
e-comerce** como piloto.

## Qué se ha recolectado en esta fase (DISCOVER)

1. **Método COSMIC** (`discover/cosmic-method.md`): modelo genérico, 4 movimientos de datos
   (E/X/R/W = 1 CFP), reglas de conteo, procedimiento de 3 fases (Strategy/Mapping/Measurement).
2. **Scope del piloto** (`discover/ecommerce-pilot-scope.md`): ~24 procesos funcionales
   candidatos del buy-flow (cart/orders/payments/returns), functional users, data groups
   preliminares, y el **gap** de data movements.

## Hallazgo bloqueante

El conteo CFP fino del piloto requiere los **movimientos de datos por endpoint** (request/
response + reads/writes a DB), que viven en los **submódulos de e-comerce no clonables**
(`127.0.0.1` caído). Ver risk-register.

## Próximas fases (no en este WP aún)

- **STRATEGY/DESIGN del skill:** definir la estructura del skill COSMIC (cosmic-strategy,
  cosmic-mapping, cosmic-measure) y su lugar en el registry de THYROX.
- **MEASURE (piloto):** completar los data movements del buy-flow (con acceso a e-comerce o
  insumo de su sesión) y calcular CFP real.

## Exit de DISCOVER

Recolección del método + scope del piloto + gaps identificados. **Cumplido.**

---

**Última actualización:** 2026-06-03T02:13:59

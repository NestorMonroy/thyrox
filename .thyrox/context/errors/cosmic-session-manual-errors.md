```yml
type: Registro de Errores
created_at: 2026-06-03 05:25:00
project: THYROX
author: NestorMonroy
status: Abierto
related: [ÉPICA 44, ÉPICA 45, ÉPICA 46]
```

# Errores de proceso manual en la sesión COSMIC — y por qué validan la verificación determinística

> El Ejecutor observó: "estás teniendo muchos ERRORES, que sirven para COSMIC". Cierto en
> ambos sentidos: cometí varios errores de proceso manual, y cada uno es **evidencia** de que
> un método de medición/calidad (COSMIC y su tooling) necesita verificación determinística,
> no conteo/colocación a mano. Se registran honestamente (calibración: no ocultar fallos).

## Inventario de errores (esta sesión)

| # | Error | Detectado por | Clase |
|---|-------|---------------|-------|
| E-a | UCs creados dentro del WP en vez de `docs/` (product docs) | el Ejecutor | colocación |
| E-b | UCs a granularidad de sizing, no de UC formal (faltaba detalle) | el Ejecutor | alcance/profundidad |
| E-c | Scope inicial estrecho (33 UCs) sin declararlo como decisión | `/thyrox:audit` cobertura | alcance |
| E-d | Baseline propagado como 677 CFP con RUP mal sumado (25≠27) | re-suma al escribir UCs formales | aritmética |
| E-e | Resumen "50×6 + 11×7" (=377) inconsistente con total 376 | audit estructural | aritmética |
| E-f | `verify.sh` colocado en `track/` de un WP transitorio en vez de `.claude/scripts/` | el Ejecutor | colocación |
| E-g | `focus.md` no actualizado al abrir el WP 46 | `/thyrox:audit` cierre | estado |
| E-h | Check de TD-044 con `-A4` (falso negativo) en mi propia verificación | re-lectura | verificación |

## Patrón sistémico

Dos familias dominan: **(1) aritmética manual** (E-d, E-e) y **(2) colocación/estado manual**
(E-a, E-f, E-g). Ambas son exactamente lo que un proceso *manual* falla y un *determinístico*
no:

- E-d/E-e → resueltos de raíz por `scripts/tally-cfp.py` (suma y valida; `--expect N` como gate).
  Si hubiera existido desde ÉPICA 44, el 677 nunca se propaga.
- E-a/E-f/E-g → mitigados por `verify-cosmic-baseline.sh` (19 checks, incl. "sin 677/378
  sueltos" y consistencia de ubicación) + la regla de colocación de docs (metadata-standards).

## Lección transversal (sirve para COSMIC y para THYROX)

**Un sistema cuya salida es un número o una afirmación de calidad debe traer su propio
verificador ejecutable.** El valor de COSMIC no es solo el método de conteo, sino el
*tooling que impide el error humano de conteo*. Mis errores no invalidan el baseline (675
está verificado); lo confirman: cada uno fue **detectado** (por el Ejecutor, un audit, o un
script) y **corregido con evidencia**, que es el estándar de calibración de THYROX.

## Acciones derivadas

- [x] `scripts/tally-cfp.py` (ÉPICA 46, F-1) — contra E-d/E-e.
- [x] `.claude/scripts/verify-cosmic-baseline.sh` — contra E-a/E-f/E-g (regresión).
- [ ] Considerar correr `verify-cosmic-baseline.sh` en CI / hook de cierre (futuro).
- [ ] PAT-001 (estado se actualiza al cerrar, no al abrir) — recurrente; evaluar hook de apertura.

**Última actualización:** 2026-06-03 05:25:00

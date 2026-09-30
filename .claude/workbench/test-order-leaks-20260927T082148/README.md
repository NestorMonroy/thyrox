# Fugas latentes de orden en provider y tool-registry

El diagnóstico por paquete (`per-package-tests-final2-*`) salía 48/48 PASS
con el orden fijo de `bun test`. Con `--randomize` y seis semillas
(11 23 37 41 53 67) sobre provider y tool-registry, **9 de 12 ejecuciones
fallaban** (`*-seed*.log`).

## Dos clases de fuga

| Víctima | Clase | Causa | Corrección |
|---|---|---|---|
| `tool-registry: ripgrep.test.ts` (caso 16) | orden DENTRO del archivo | el caso 17 añadía 8 archivos al fixture compartido | el 17 construye su propio directorio |
| `tool-registry: pdf.test.ts` (caso 7) | orden dentro del archivo | el caso 7 dependía de correr antes que los que sustituyen `execFileNoThrow` | se re-registra una copia real tras cada caso |
| `tool-registry: skillUsageTracking.test.ts` | ENTRE archivos | `adapterFactory.integration.test.ts` sustituía `@thyrox/config` sin deshacerlo | copias reales + `afterAll` |
| `provider: {,src/}__tests__/providerRouting.test.ts` | entre archivos | `thinking`, `providerCommandUnset` y las dos `providerRouting` sustituían `@thyrox/config{,/settings}` sin deshacerlo | copias reales + `afterAll` en los cuatro |

Lo que revierte un `mock.module` en bun 1.3.11 es registrar una COPIA de las
exportaciones reales tomada antes de sustituir; el espacio de nombres mismo
queda parcheado en su sitio (`test-isolation-leaks-20260927T080507`).

## El instrumento que no veía

`pair.sh` (víctima + compañero, orden fijo) dio 0 en las 42 parejas: **bun
ORDENA los archivos que recibe**, así que `suggestions/` corría siempre antes
que `tools/` y la víctima nunca quedaba detrás del culpable. `alone.sh`
separó las dos clases (la víctima sola, barajada) y `pair-seeded.sh` —la
pareja bajo las seis semillas— encontró a los culpables
(`pairs-provider-result.tsv`).

## Resultado

- Después: **12 de 12** ejecuciones barajadas en verde, 0 fallos
  (`after/*-seed*.log`: provider 1816, tool-registry 1418).
- Anulaciones, cada una devuelve exactamente su patrón original:
  sin el re-registro de `pdf` → semillas 37, 53 y 67 con 1 fallo;
  sin el `afterAll` de `adapterFactory.integration` → 11 fallos en
  11, 41 y 67; sin el de `thinking` → sólo su pareja vuelve a 15
  (`pairs-provider-after.tsv` es el estado corregido).

Métrica: fallos por ejecución de `bun test --randomize --seed=N`.
Ciega a: fugas que ninguna de las seis semillas ordena de forma dañina, y a
las de los otros 46 paquetes, que no se barajaron aquí.

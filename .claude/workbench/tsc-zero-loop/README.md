# El lazo tsc cero sobre el árbol real

`ledger.jsonl` es el registro de veredictos que `bin/tsc_zero_step` añade en
cada paso y que `bin/tsc_schedule` lee con `--ledger`. Cada `step-*` guarda
sus candidatos, su semilla, los logs de `tsc` (`before`, `batch`, `confirm`,
`final`) y el informe del paso.

## Primer paso (`step-20260923T201918`): 26 de 26 no aceptadas, y no por interacción

Los 26 candidatos `infer-from-usage` salieron 25 `rejected` y 1 `partial`, casi
todos con el objetivo IGUAL antes y después y un TS2322 nuevo
(«boolean no asignable a `{ type: string; … }`»). La causa no era que los
archivos interactuaran: `inferFromUsage` inserta la anotación y el `)` en el
MISMO punto tras el nombre de una flecha sin paréntesis, y los dos
aplicadores (`tsLanguageService.applyEdits` y el de `tsc_zero_step`) las
aplicaban al revés con orden estable. `b => …` quedaba `(b): T => …`: la
anotación del parámetro convertida en tipo de retorno.

El mismo defecto explica los 26 rechazos que la ronda anterior atribuyó a
interacción, y dejó tres anotaciones mal colocadas ya commiteadas (en
`brief.ts`, `plan.tsx` y `McpAuthTool.ts`). Pasaron `tsc` por casualidad de
tipos. Se devolvieron a su texto original para que el lazo las vuelva a
proponer con el desempate corregido; las otras cuatro de ese lote ya las había
corregido la segunda ronda (`(arg: string): string`).

Métrica: veredictos por propuesta del registro y el log del lote.
Ciega a: si el aplicador de otras herramientas del árbol comparte el defecto;
sólo se midieron las dos copias que el lazo usa.

## Gates del plan v2.2.0 (2026-09-24T20:51:44)

Los pasos 3b (memoria estructurada) y 4 (aplicación masiva) dejaron de ser
descripción: el lazo se detiene si se omiten.

| Gate | Dónde | Bloquea cuando | Salida |
|---|---|---|---|
| 3b | `close_step.sh` → `bin/tsc_reflect gate-memory` | un paso con avance conserva archivos que ningún patrón cubre: su `signal` tiene que casar los objetivos del paso **y** su `applied` nombrar el archivo | exit 4; se registra con `bin/tsc_sweep add-pattern` + `applied` |
| 4 | `bin/agent_proposal --run` | un patrón sigue vivo fuera de la candidata | exit 4; se incluyen sus archivos, o se declara `bin/tsc_sweep exclude` / `close` con `--reason` |

Un patrón puede ser **no mecánico** (sin `--site`/`--replace`): cuenta
como memoria y para los dos gates, pero `tsc_sweep propose` lo rehúsa.

Las dos preguntas de verificación del plan las publica un comando, con su
denominador:

```bash
bash bin/tsc_reflect audit --run <run>
```

*Métrica:* pasos `progress` con archivos conservados; cubiertos si todo
archivo está en el `applied` de un patrón cuya señal casa sus objetivos;
masivos si un solo patrón cubre más de un archivo del paso.
*Ciega a:* que el patrón sea **bueno** — eso sólo lo decide el verificador
neto —, y a una aplicación masiva hecha por `tsc_sweep` sin pasar por
`applied`.

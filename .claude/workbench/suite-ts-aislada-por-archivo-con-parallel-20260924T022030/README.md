# suite-ts-aislada-por-archivo-con-parallel

## El encargo

> sigues sin usar parallel de gnu linux porque? — y la caída de Bun con las cuatro exportaciones del pase.

## La premisa, si se corrigio al primer comando

## Las piezas

| archivo | que hace |
|---|---|
| `probes/medir.sh` | cada `*.test.ts` en su propio `bun test`, con GNU parallel `-j4`; suma pass/fail/errores/caídas |
| `outputs/totales.txt` | la suma |
| `outputs/joblog.tsv`, `outputs/por-archivo/` | exit y salida por archivo |

## Los resultados

Con las cuatro exportaciones en el árbol: **14 319 pass, 211 fail, 19 errores, 0 caídas, 113 s, 67 archivos en rojo**. En un solo proceso, sin ellas: 14 119 / 260 / 26 en 120 s; con ellas, Bun se cae. Aislar elimina la caída y descubre 200 pasadas que la contaminación entre archivos tapaba, sin costar tiempo.

*Metrica:* líneas `N pass`/`N fail`/`N errors` del stderr de cada `bun test`, sumadas.
*Ciega a:* un test que sólo pase GRACIAS a un `mock.module` de otro archivo: aislado cae, y cuenta como rojo nuevo, no como defecto del aislamiento.

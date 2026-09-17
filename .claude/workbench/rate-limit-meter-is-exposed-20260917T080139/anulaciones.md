# Controles de anulación — cada uno cae exactamente lo que depende de él

Verde de partida: **29 pass, 0 fail**.

| # | Pieza de juicio retirada | Caen | Cuáles |
|---|---|---|---|
| 1 | la escala (`utilization * 100` → `utilization`) | **3** | los dos casos de composición que publican porcentaje, y el de FIDELIDAD: el recipe del propio cliente deja de resolver cifra |
| 2 | el filtro de frescura en la composición (`filterFreshWindows(windows, now)` → `windows`) | **1** | exactamente el caso que afirma que el payload filtra antes de componer. Los casos unitarios de `filterFreshWindows` NO caen, y es correcto: se retiró su USO, no la función |
| 3 | la puerta de gateway (`source === 'gateway' && fresh.overage` → `fresh.overage`) | **1** | exactamente el caso de `spend_limit` |

La anulación 1 hace caer también el caso de `spend_limit`: no es una caída de
más — ese caso afirma `used_percentage: 25` a partir de `utilization: 0.25`, así
que depende de la escala tanto como el de `five_hour`.

Restauración verificada con `git diff --stat` vacío sobre el módulo, y la suite
de vuelta en 29 pass / 0 fail.

## Por qué el código de salida del recipe entra en la aserción

El recipe del cliente cierra con `[ -n "$pct" ] && printf …`, así que **salir 1
ES su forma de declarar «no hay cifra»**. La primera versión del envoltorio usaba
`execFileSync`, que convierte ese 1 en excepción: las dos anulaciones de
fidelidad fallaban por el envoltorio, no por el mecanismo. Con `spawnSync` se lee
salida Y código, y la aserción pasa a ser `{ out: '', code: 1 }` — que separa «el
medidor calla» de «el recipe se rompió», distinción que la versión anterior no
podía hacer.

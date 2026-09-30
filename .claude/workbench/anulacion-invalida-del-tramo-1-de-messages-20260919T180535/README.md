# anulacion-invalida-del-tramo-1-de-messages

## El encargo

<!-- verbatim, sin parafrasear -->

> vas a continuar en /loop y en automatico con todas las implementaciones que
> tenemos de thyrox, corregir todos los TEST que estan en RED, y realizar las
> implementaciones pendientes de claude-code-nestor-monroy-tools para thyrox

Y, reiterada cinco veces: *"ya no crees TASK. Crear la tarea sin hacerla es
reportar, no trabajar. Las tienes que hacer."* / *"queremos 0 errores."*

## La premisa, si se corrigio al primer comando

**No se corrigio al primer comando: se corrigio DOS veces, y la segunda
invalida lo que el commit `2a6ccafc` publico.**

1. **Primera correccion — el control de `2a6ccafc` no podia discriminar.**
   El commit cita una anulacion que compara «tramo con imports rotos» contra
   «tramo con imports arreglados». Medido por conteo de lineas: la instantanea
   se tomo con el archivo ya en 1282 lineas —o sea, DESPUES del tramo—, contra
   1300 post-arreglo; `HEAD~1` tiene 808. **Las dos ramas llevaban el tramo**,
   asi que el control medio el arreglo de seis imports, no el tramo.

2. **Segunda correccion — la ATRIBUCION del commit es falsa.** `2a6ccafc`
   declara que los dos rojos restantes eran **premisa rancia** (un fallo del
   grafo de modulos por `proper-lockfile`). Medido tras `bun install`, los dos
   rojos reales eran del **SUJETO** —el porte incompleto—:

   ```
   message-pipeline.test.ts -> Export named 'normalizeMessages' not found
   messages.test.ts         -> Export named 'prepareUserContent' not found
   ```

   El fallo de `proper-lockfile` **enmascaraba** el error real: un grafo de
   modulos que muere antes de resolver los exports nunca llega a reportarlos.
   Leer el primer error de la cadena y atribuirle la causa es el sub-patron C
   de `metrica-decide-la-conclusion.md` —medir el significante (el mensaje que
   aparecio) y concluir sobre el significado (que fenomeno lo produjo)—.

   **Consecuencia:** el cuerpo de `2a6ccafc` esta publicado y no se enmienda
   (`--amend` sobre historia publicada esta prohibido). Este banco es el
   registro de la correccion, y el commit del tramo 2 la cita.

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/por-que-el-control-no-discriminaba.txt` | la primera correccion: el conteo de lineas de las dos ramas contra `HEAD~1` |
| `outputs/anulacion-valida-del-tramo-2.txt` | el control que SI discrimina, corrido sobre el tramo 2 |

## Los resultados

**El control valido, el del tramo 2** — se retiran los DOS archivos a `HEAD`,
se corre el subconjunto derivado, se restauran y se re-corre:

```
--- ANULADO (HEAD) ---      0 pass, 1 fail
                            SyntaxError: Export named 'normalizeMessages' not found
--- RESTAURADO ---          8 pass, 0 fail
```

Caen **exactamente** las aserciones que dependen del tramo, y la restauracion
se verifico byte a byte con `cmp` contra la copia previa (no con `git diff`,
que no distingue «restaure» de «nunca toque»).

*Metrica:* `pass`/`fail` de `tests/integration/message-pipeline.test.ts` con
los dos archivos del tramo en `HEAD` y en su version de trabajo.
*Ciega a:* si el cuerpo de cada simbolo portado hace lo mismo que el de la
fuente — el control mide que el modulo RESUELVE y que sus 8 aserciones pasan,
no equivalencia semantica simbolo a simbolo. Y ciega al segundo rojo del
subconjunto (`messages.test.ts`), que tras el tramo ya no nombra ningun
simbolo de `messages.ts`: nombra `installConfigHostBindings`, de OTRO paquete.

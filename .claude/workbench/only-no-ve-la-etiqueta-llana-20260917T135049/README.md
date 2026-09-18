# only-no-ve-la-etiqueta-llana

## Qué se pregunta

Un trabajo registrado con `bg.sh register pyreds` **estaba** en el ledger, y
`wait-jobs.sh wait --only pyreds` respondía:

```
sin trabajos registrados
```

saliendo **0**. La barrera declaraba haber recogido lo que nunca vio.

Ese 0 es la forma exacta del **sub-patrón D**: no separa «no había nada que
esperar» de «el filtro no vio lo que sí estaba». El turno siguiente cerró
creyendo que el trabajo estaba asentado.

## Qué se midió

`cmd_wait` compone su universo con **un solo** glob:

```bash
jobs=("$LEDGER/$only"-*.job)          # prefijo MÁS guion
```

La bandera se documenta como **prefijo** —`--only exige un prefijo`— y el glob
exige prefijo **y** guion. Las dos formas que el ledger contiene no coinciden:

| Quién la produce | Forma de la etiqueta | ¿La ve el glob del grupo? |
|---|---|---|
| `run-task-pool.sh` | `lote-001`, `lote-002` | sí |
| **`bg.sh register <nombre>`** | **`pyreds`** | **no** |

La segunda es la que el flujo documentado en `trabajo-en-segundo-plano.md`
prescribe —`start` · `register` · `wait`— así que el filtro era ciego justo al
camino que la regla enseña.

## El arreglo

El glob admite **las dos** formas: la etiqueta exacta y su grupo.

```bash
jobs=("$LEDGER/$only".job "$LEDGER/$only"-*.job)
```

**El guion se conserva en la forma de grupo, a propósito.** Retirarlo
ensancharía la colisión que TASK-THYROX-0084 ya registra: `pool` seguiría sin
ver a `pool2-001`, que es lo correcto mientras esa tarea no se decida.

Y el mensaje de la bandera pasa a decir `--only exige una etiqueta`: la
redacción anterior describía el glob roto, no el contrato.

## El control de anulación, quirúrgico

Retirado **sólo** el elemento de coincidencia exacta (`"$LEDGER/$only".job`),
la suite vuelve **byte a byte** al rojo de partida:

```
resumen: 7 ok, 1 fallo(s)
  ok    wait --only <etiqueta llana> la asienta y sale 0
  FALLO y NO publica «sin trabajos registrados» sobre un trabajo real
```

`diff rojo-antes-del-arreglo.txt anulacion-retirado-el-glob-exacto.txt` → vacío.
Cae **exactamente una** aserción. Sobreviven las siete restantes, y entre ellas
las dos que protegen a los demás llamadores: el caso 3 (sin filtro, la barrera
sigue abarcando el ledger entero y sale 3) y el caso 5 (el grupo con guion
sigue viéndose).

**La forma del rojo es en sí la evidencia de que el control discrimina.** La
primera aserción del caso 4 —exit 0— **pasa** en el rojo: un control que sólo
hubiera medido el código de salida habría publicado verde con el defecto vivo.
Lo que lo delata es el literal en stdout, y por eso el caso mide los dos.

## Lo que este banco NO cierra

El caso de **cero coincidencias legítimas**. Un `--only` cuyo grupo está
genuinamente vacío sigue saliendo 0, y este banco no lo separa de un filtro
ciego. No se tocó porque su desenlace depende de otra pieza: medido,
`run-task-pool.sh` **no** tiene guard `LAUNCHED > 0`, así que un pool de cero
trabajos necesita hoy ese 0 para no fallar. Cambiar la semántica sin el guard
rompería al pool.

## Trazabilidad

- Tarea: **TASK-THYROX-0085**
- Hallazgo: **H-THYROX-51**
- Sujeto: `thyrox: src/session/wait-jobs.sh`
- Control: `thyrox: tests/session/test-run-task-pool-alcance.sh` (casos 4 y 5)

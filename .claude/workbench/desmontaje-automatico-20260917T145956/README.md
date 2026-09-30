# Desmontaje automatico del fixture, y el triaje de las supresiones mudas

Dos tareas del mismo pase: TASK-THYROX-0089 (#439) y TASK-THYROX-0090 (#440).

## #439 — las seis suites que fugaban

El arreglo NO fue escribir seis `trap`: eso es la duplicacion que DRY prohibe,
seis copias que envejecen por separado. Es `src/lib/fixture.sh`, una
herramienta con seis consumidores.

Tres decisiones de diseno, cada una forzada por una medicion:

1. **El registro vive en un ARCHIVO.** `d=$(fixture_dir)` corre en un subshell
   y un arreglo modificado ahi se pierde al volver. Con archivo se conserva el
   idioma que las seis ya usaban.
2. **La ruta del registro se fija al ARMAR, en el padre.** Abrirla dentro de
   `fixture_dir` dejaba la variable en el subshell: el archivo sobrevive, su
   ruta no. Costo medido: 4 de 11 aserciones en rojo hasta corregirlo.
3. **`fixture_arm` COMPONE con el `trap` vigente.** `trap ... EXIT` reemplaza,
   no acumula; dos de las seis ya tenian desmontaje propio y lo habrian
   perdido en silencio.

Veredicto por conducta, mismo instrumento que las condeno:

| suite | antes | despues | exit propio |
|---|---|---|---|
| test-wait-jobs.sh | confined=25 | **0** | 1 → 1 |
| test-wait-jobs-dependencia.sh | 11 | **0** | 0 → 0 |
| test-run-task-pool-alcance.sh | 8 | **0** | 0 → 0 |
| test-process-group.sh | 1 | **0** | 1 → 1 |
| test-toolchain-sh.sh | 1 | **0** | 0 → 0 |
| test-verificar-premisa.sh | 1 | **0** | 1 → 1 |

Las seis conservan su exit exacto: el arreglo de fuga no rompio ninguna. Los
tres rojos ya lo eran, y son del triaje de TASK-THYROX-0081.

## #440 — 22 supresiones, no 26

El conteo de la tarea era cota superior de un regex por linea. Tres pasadas:

| pasada | instrumento | COMANDO |
|---|---|---|
| 1 | regex por linea | 26 |
| 2 | + profundidad de `$(` | 29 |
| 3 | + excluye comentarios y cierres de sustitucion | **22** |

La segunda SUBIA el conteo: contaba cuatro comentarios que NOMBRAN la forma
—dos de ellos explicando por que su `|| true` es correcto— como si fueran la
forma. Medir el significante y concluir sobre el significado, con el propio
instrumento del triaje como sujeto.

### Clase A — legitimas, el fallo no porta informacion (19)

El fallo ES el camino normal: `grep -v` sin lineas supervivientes, `disown` de
un trabajo ya cosechado, `timeout ... tail -f --pid` al vencer la gracia,
`git diff --cached` sin coincidencias. `src/lib/toolchain.sh:209` es el
ejemplar: su comentario declara que el exit del instalador no decide y
re-comprueba el binario — la disciplina de vvv, ya aplicada.

### Clase B — anunciadas en este pase (3)

| sitio | que enterraba |
|---|---|
| `src/task/close-wp.sh:50` | un guion **que no existe**: `.claude/scripts/task/update-state.sh` es la ruta anterior a la mudanza. El paso llevaba sin ejecutarse un tiempo indeterminado |
| `src/verify/validate-phase-completion.sh:92` | un `git fetch` fallido no deja el veredicto sin dato: lo deja midiendo la ref remota RANCIA, y el gate puede publicar «sincronizado» sobre un remoto que nadie consulto |
| `src/verify/install-hooks.sh:76` | un `chmod +x` fallido deja los hooks instalados e **inertes**. La linea 138 del mismo guion ya documentaba ese defecto para su propio caso |

Las tres conservan la tolerancia —no abortan— y anuncian, como
`vvv: config/homebin/box-minimize.sh:8` con su `dd`. Callar y tolerar no son
la misma decision.

## Mitad roja persistida

`salidas/rojo-fixture-lib.log` — 5 ok, 5 fallo, antes de que `src/lib/fixture.sh`
existiera.

## Control de anulacion

`THYROX_TEST_COMPOSE_TRAP=0` retira la composicion: el `trap` propio de la
suite deja de correr y cae exactamente la asercion que lo mide.

# La columna «borrado y abierto» sumaba archivos VIVOS — TASK-THYROX-0219

`disk-headroom.sh` publicaba **385.60 MiB** de «espacio que no vuelve hasta
cerrar el descriptor». Lo real eran **5.30 MiB**, y ninguno en este montaje.

Lo destapó ejecutarlo: el ejecutor pidió correr el guion ante un disco al
100 %, y su respuesta mandó a buscar ~400 MiB de descriptores que no existen.
Un barrido de `/proc` en el turno anterior encontró **0** — y la conclusión
que se sacó entonces fue «los sostienen procesos que no veo», cuando la
verdadera era «el instrumento está sumando otra cosa».

## Tres defectos en una sola columna

| # | Qué | Coste en el fixture |
|---|---|---|
| 1 | `lsof` **OREA** sus selectores salvo con `-a`. `+L1 -- /` se lee «(nlink<1) **O** (abierto en /)», así que devolvía todo lo abierto bajo el montaje | 263.51 → 15.30 MiB |
| 2 | sumaba **por fila**, no por inodo: un archivo con tres descriptores contaba tres veces | 20.00 → 10.00 MiB |
| 3 | no acotaba al **dispositivo** del montaje: un `memfd` borrado no ocupa `/` | 15.30 → 10.00 MiB |

Medido en el contenedor: `lsof +L1 -- /` devuelve **221 filas, de las que 1
está `(deleted)`**. `lsof -a +L1 -- /` devuelve **0** — el AND es correcto, y
de paso el `memfd` cae solo porque vive en otro dispositivo.

## Por qué importa, y no es una cifra decorativa

La columna alimenta una decisión: *«¿cierro descriptores para recuperar
espacio?»*. Inflada, la respuesta es sí y la búsqueda es infructuosa. Es el
sub-patrón **A** de `metrica-decide-la-conclusion.md` —un encabezado que
nombra una cosa y contiene otra— con el instrumento de medición como sujeto.

## La suite no podía verlo, y eso era estructural

Las 18 aserciones previas **bypaseaban esta rama por construcción**: sólo se
alcanza con `DISK_HEADROOM_STATFS` vacío, y los ocho casos la fijan para ser
deterministas. Una rama sin punto de inyección es una rama sin control.

El arreglo añade `DISK_HEADROOM_LSOF` como **cuarto** punto de inyección,
hermano de `_MOUNTS`, `_STATUS` y `_STATFS`, más `DISK_HEADROOM_DEV` para el
dispositivo.

## Controles

**De anulación, sobre el guion real.** Retirada cada corrección por separado
caen **exactamente 2 de 24** aserciones —la del valor exacto y la anclada a
esa corrección— y ninguna más. Restaurado, `diff -q` idéntico y vuelve a 24/0.
Verbatim en `outputs/control-de-anulacion.txt`.

**El ancla importa, y su primera versión no discriminaba.** Las aserciones
negativas estaban ancladas a 263.51 —el valor con las tres correcciones
retiradas— y **sobrevivían** a retirar sólo el filtro de borrado, porque con
la deduplicación y el dispositivo aún puestos la cifra cae a 208.21. Pasaban
por la razón equivocada: el sub-patrón **D** dentro del control escrito para
evitar el A. Ahora cada una está anclada a la cifra de **su** defecto.

**Y el valor esperado lo puso la medición, no mi aritmética:** escribí 208.20
y el fixture dio **208.21**. Se corrigió el esperado, no la medida.

## `grep -c` no es una aserción — pregunta del ejecutor, en el mismo pase

*«¿por qué grep?»*. No había razón. `grep -c` sin coincidencias emite **dos
señales que se contradicen**: `stdout` «0» y `exit` **1**; bajo `pipefail` la
tubería sale 1. El veredicto depende de cuál lea quien llama — que es la forma
que `TASK-THYROX-0148` tiene abierta para `grep -q`.

Y la suite **ya tenía `assert_contains`** y no su negativo, así que se contó
en vez de afirmar. Añadido `assert_not_contains`, que consume el código de
salida dentro del `if` igual que su hermano. Sustituidas las 4 aserciones
nuevas **y la pre-existente del caso 6**, que arrastraba la misma forma desde
`TASK-THYROX-0051`.

## Alcance

*Métrica:* filas de `lsof`, su centinela `(deleted)`, su dispositivo (`$6`) y
su inodo (`$9`); y el veredicto de las 24 aserciones bajo cada anulación.
*Ciega a:* si `lsof` está ausente —ahí la columna publica «(no medido)», que
es lo correcto—; a un `lsof` cuyo formato de columnas difiera del de este
contenedor; y a la descomposición `dev_t` en un sistema con major muy grande,
donde el filtro de dispositivo podría no casar y **dejar pasar de más**, nunca
de menos.

## Lo que este banco NO cierra

- `tests/session/test_generate_bin.py` sale rojo en el subconjunto derivado.
  Es **pre-existente y bloqueado por directiva**: no se toca `bin/` ni
  `generate_bin.py` hasta que las tres lenguas estén en verde.
- El gate que rechazaría `grep -c`/`grep -q` sobre variable es
  **TASK-THYROX-0148**, que sigue abierta. Este pase corrige un archivo, no
  cierra la forma.

## La cifra falsa SÍ había aterrizado — lo destapó buscar-hallazgos, no una relectura

Al indexar `H-THYROX-114` el `buscar-hallazgos --query "borrado y abierto"`
devolvió **`H-THYROX-82`**, del 2026-09-18, cuyo titular era:

> *368 MiB de lo liberado no vuelven: el cliente sostiene el fd*

Su fuente es `08-la-familia-repo-de-disco.txt:38`, que publica
`borrado y abierto 367.97 MiB` — **el mismo instrumento roto**. Corregido con
`--force`, separando las tres mitades en vez de borrarlo:

| Parte | Veredicto |
|---|---|
| punto 1 — «los 368 MiB son los que se acaban de borrar» | **cae**; la observación de fondo (df sube menos de lo borrado) es independiente y **queda DESCONOCIDA**: su única cuantificación venía del instrumento roto |
| punto 2 — truncar en vez de borrar | el mecanismo **sobrevive**; su comparación «2.6 G contra 368 M» pierde un extremo |
| punto 3 — `resv_strict` cierra la reserva incluso a root | **sobrevive intacto**: se lee de `/proc/self/mounts` y `/proc/self/status`, no de `lsof`, y hoy se reproduce exacto |
| el reparto del disco | **sobrevive**: sale de `du -x` |

**Lo que esto enseña sobre el paso 5 del flujo de sesión.** La búsqueda previa
del banco —`grep "395\.5\|395 MiB"` sobre `.claude/**` y `source/**`— dio
**cero**, y concluí que la cifra no había aterrizado. Era el sub-patrón **C**:
busqué el *significante* (mi cifra de hoy) y concluí sobre el *significado*
(«ninguna cifra de esta columna está publicada»). La de ayer era **367.97**, y
ningún grep de la de hoy la encuentra. Lo que sí la encontró fue buscar por el
**fenómeno** — el nombre de la columna— que es para lo que el store existe.

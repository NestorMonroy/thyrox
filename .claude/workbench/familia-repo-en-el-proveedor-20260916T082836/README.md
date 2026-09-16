# familia-repo-en-el-proveedor

## El encargo

<!-- verbatim, sin parafrasear -->

«El gitlink-bump-gate.md, tiene su script? si es que no, podríamos crear sus
scripts en el PROVIDER thyrox — al igual de estos, [entropia de bytes] …
[huella en el object store] … y cual quiero otro que nos ayude, como son cosas
que es muy probable que pasen muy seguido»

## La premisa, si se corrigio al primer comando

**`gitlink-bump-gate.md` NO tenia gate — confirmado.** Sus cinco apariciones en
`src/` del proveedor son citas de su propia frase —*«la leccion escrita no
previene la reincidencia; solo un gate ejecutable lo hace»*— en comentarios de
OTROS mecanismos. La regla que enuncia que la prosa no previene era prosa sin
script.

## Las piezas

| archivo | que hace |
|---|---|
| `src/repo/object_footprint.py` | cuanto pesa en la historia un archivo que cambia cada sesion, con el **denominador medido** en vez de escrito a mano |
| `src/lib/byte_entropy.py` | entropia de bytes y compresibilidad real, sin llamar «cota inferior» a lo que no lo es |
| `src/repo/gitlink_bump.py` | el gate que la regla pedia: tres salidas, y la ausencia nunca se redacta «publicado» |
| `src/repo/pack_headroom.py` | ¿cabe `gc` (= `repack -a -d`), solo `repack -d`, o ninguno? |

## Los resultados

### Las cuatro suites, y sus controles de anulacion

| modulo | verde | anulacion aplicada | cae |
|---|---|---|---|
| `object_footprint` | 10/10 | `loose = set()` (sin el listado de sueltos) | 1 |
| `byte_entropy` | 11/11 | la palabra «cota inferior» esta vetada por test | — |
| `gitlink_bump` | 14/14 | se ignora `source` (referencia = arbol del padre) | **3** |
| `pack_headroom` | 18/18 | `SAFETY_MARGIN = 1.0` | **2** |

Ni una asercion mas en ninguno de los cuatro. La anulacion de `pack_headroom`
deja pasar «el margen es lo que hace fallar al caso al milimetro» **a
proposito**: ese caso deriva su umbral de la propia constante, asi que se mueve
con ella — es el limite declarado del control, no un fallo.

### Contra los sujetos reales

El comando manual del que nace `object_footprint` publicaba, ANTES del repack
de la sesion anterior:

```
versiones blob = 292 / suma en claro = 1669.1 MiB / ocupacion disco = 355.5 MiB
media/version = 5.72 MiB  mayor = 10.22 MiB / 355.5 MiB = 36.2%
```

Medido hoy con el modulo, sobre el mismo sujeto:

```
huella de «agent_store.sqlite3»
  versiones        292   (sueltas 0 · empaquetadas 292)
  suma en claro    1669.07 MiB
  ocupacion disco  13.82 MiB
  media/version    5.72 MiB   mayor 10.22 MiB
  cuota de blobs   2.3 %   (denominador medido: 594.09 MiB)
```

**Misma poblacion, 25.7x menos ocupacion.** Las 292 versiones estaban sueltas y
ahora estan empaquetadas: un objeto suelto no lleva delta por construccion, asi
que cada una pagaba su tamaño entero. No es que el archivo encogiera — es que
el `repack -d` de la sesion anterior las delto contra sus hermanas.

Dos cosas que esto corrige, y las dos eran mias:

1. La extrapolacion de **11.4x** que publique desde una muestra de 12 versiones
   era baja por mas del doble. El factor real es **25.7x**.
2. El denominador del comando manual estaba **escrito a mano** (`982.6`). El
   medido hoy es **594.09 MiB**. El cociente cambia por los dos operandos a la
   vez, y solo uno de los dos estaba bajo sospecha.

### El gate de gitlink, en su estado real

```
AUSENTE — «/home/user/kaupamex» no es un clon de git: el superproyecto esta
ausente de la sesion.
  No se declara bumpeado ni pendiente: el estado del gitlink no se puede medir
  desde aqui.
exit=2
```

Es la tercera salida, y es la razon de que existan tres. Un guion que saliera 0
aqui diria «coincide» sin haber mirado ningun gitlink.

### El headroom, que es el instrumento que falto

```
docs    sueltos 643 (9.59 MiB) · empaquetados 82741 (609.61 MiB)
        libre 953.87 MiB · pico completo 619.20 · pico incremental 9.59
        VEREDICTO repack completo → git gc
thyrox  sueltos 28 (0.11 MiB) · empaquetados 34471 (157.26 MiB)
        VEREDICTO repack completo → git gc
```

Hoy los dos caben. Cuando los dos `git gc` murieron, no cabian — y nadie lo
midio antes de lanzarlos, porque no habia con que.

*Metrica:* las cuatro suites y la salida de los cuatro modulos contra
`kaupamex-docs` y `thyrox`, en este pase.
*Ciega a:* lo declarado en `manifest.json`.

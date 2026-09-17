# baseline-de-huerfanos-tras-la-mudanza

## Qué se pregunta

`test_censar_scripts` publicaba 9 de 10 con una sola falla:

```
FAIL BASELINE existe: .claude/scripts/corpus/scripts_huerfanos_baseline.txt
     el generador declara una ruta anterior a la mudanza; --huerfanos lee 0 en baseline
```

Dos causas dan el mismo síntoma y tienen arreglos opuestos:

- **(a)** la ruta es rancia — el archivo se mudó y el literal se quedó atrás;
- **(b)** el baseline no pertenece al consumidor, y repuntar a otro sitio
  dentro de él sería adivinar.

## Qué se midió para separarlas

`probes/probe_baseline_resolution.py`:

```
rancia  False  <consumidor>/.claude/scripts/corpus/scripts_huerfanos_baseline.txt
real    True   <consumidor>/.claude/baselines/scripts_huerfanos_baseline.txt

entradas con la ruta rancia: 0
entradas con la ruta real:   5

14 archivo(s) en <consumidor>/.claude/baselines
el nuestro esta entre ellos? True
```

**(a) confirmada, y (b) descartada por el mismo dato.** El archivo existe, su
contenido es el correcto —cinco guiones «congelados al cerrar #912»— y vive
con **trece hermanos** en `.claude/baselines/`. Repuntar ahí no es elegir un
sitio: es el hogar que el resto del corpus ya usa, y que
`hallazgos-documentacion-obligatoria.md` declara — *«el baseline se queda aquí
porque es el parámetro de ESTE corpus, no del mecanismo»* (DEC-04).

Un tercer hecho que la sonda destapó sin buscarlo: `baseline_path()` **rehúsa**
con `ConsumerUnknownError` cuando el cwd está en el proveedor, y es su conducta
correcta (TASK-DOCS-0286). El rehúse no es una segunda causa del rojo — es el
mecanismo funcionando; por eso la sonda declara el consumidor en vez de
ascender.

## El arreglo, y su control

Un segmento de ruta: `.claude/scripts/corpus/` → `.claude/baselines/`. Se
conserva `reach.consumer_root()`, que es el resolutor canónico del proveedor;
**no** se adopta el ascenso ad-hoc de `check_vocabulario_prosa.py`, que lo
precede y lo esquiva — unificar los dos es TASK-DOCS-0407, no este pase.

**Anulación quirúrgica:** revertido SOLO el segmento, la suite cae de
**10 ok, 0 fallas** a **9 ok, 1 falla** — exactamente la aserción que depende
de él, ni una más. Restaurado, vuelve a 10 de 10.

**Y el efecto va más allá de lo que el test mide.** La aserción sólo comprueba
`exists()`, que no distingue «el gate carga el baseline» de «el gate apunta a
algo que está ahí». El gate corrido de verdad
(`.claude/jobs/huerfanos-tras-repunte-20260917T124203/`) publica **5 en
baseline** contra los 0 de antes.

## Lo que este banco cierra de paso

El docstring del módulo citaba **cinco veces** la invocación
`python3 .claude/scripts/corpus/census_scripts.py`, que es la ruta anterior a
la mudanza a thyrox — la misma premisa rancia que el baseline, en el mismo
archivo. Repuntadas a `bash bin/census_scripts`, que es la forma que
`trabajo-en-segundo-plano.md` fija: *«se invoca por el nombre corto, no por la
ruta al fuente»*. Se paga al tocar el archivo, no en un barrido (#41 sigue
abierta para el resto del árbol).

*Métrica:* existencia y entradas no-comentario de los dos candidatos, contra
el hogar real de los catorce baselines; más el conteo que el gate publica.
*Ciega a:* si las cinco entradas congeladas siguen siendo los guiones
correctos — el gate mide huérfanos **nuevos**, no la vigencia del baseline.

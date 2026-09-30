# el-auditor-ciego-a-su-propio-lector

## Que se pregunta

`test_config_precedence` publicaba 17 de 18 con una sola falla:

```
FALLA el auditor NO cubre la precedencia por bucle de thyrox_root
       esperado: ['from_process']
       real:     []
```

Dos causas dan el mismo `[]` y tienen arreglos opuestos:

- **(a)** una guarda no es cadena — contrato del auditor, expectativa rancia;
- **(b)** el auditor no reconoce la lectura — ceguera del auditor.

## Que se midio para separarlas

Tres muestras sinteticas identicas salvo el LECTOR:

```
os.getenv        -> branch_order ['declared', 'otra']
os.environ.get   -> branch_order ['declared', 'otra']
env_value        -> branch_order []
```

**(b) confirmada por conducta.** `FUENTES` traia
`{'get_secret','get_secret_str','getenv','get'}` y no `env_value`, que es el
lector de ESTE arbol. Sobre `reach.py`: siete ligaduras de `declared`, una
visible —la que llama a `os.environ.get` directamente, linea 246— y **seis
invisibles**. El `[]` no decia «no hay cadena» sino «no vi ninguna lectura», y
las dos publican lo mismo.

## Cuando se quedo ciego

`8ea1d652` («Declare the driven port that envValue implements») retiro
`from_process = os.environ.get(name)` de `env_value` al darle su puerto
conducido. Con esa linea se fue la unica lectura que el auditor sabia ver
dentro del mecanismo. El identificador que la expectativa nombraba murio en
ese commit, y el rojo de la suite fue su unico testigo durante ocho dias.

Es el sub-patron C de `metrica-decide-la-conclusion.md`: se medía el literal
`getenv` y se concluía sobre precedencia de configuracion.

## El arreglo, y su control

`env_value` entra en `FUENTES`. La expectativa pasa a `['del_entorno']` —la
cadena de `clone_prefix`, de la que sobrevive un nombre porque el otro paso
(`derive_clone_prefix`) no es lectura de configuracion— y se anaden **dos
discriminadores**, sin los cuales el arreglo no seria distinguible de rendirse
a `[]`:

```
check('el auditor ve las lecturas que pasan por env_value',
      True, len(mod.assignment_order(texto_reach)) > 1)
check('y env_value cuenta como fuente', True, 'env_value' in mod.FUENTES)
```

**Anulacion quirurgica:** retirado SOLO `env_value` de `FUENTES`, caen
**exactamente 3** de las 20 —la expectativa y los dos discriminadores—, ni una
mas. 17 de 20.

**El ensanche no introduce falso positivo:** `scan` sobre el arbol da
0 discrepancias antes y despues, sobre 377 archivos `.py`.

*Metrica:* `branch_order` y `assignment_order` sobre muestras que solo
difieren en el lector, y sobre `reach.py` real.
*Ciega a:* si la precedencia que `reach.py` implementa es la CORRECTA — el
auditor mide que el orden de guarda coincida con el de lectura, no que ese
orden sea el deseado. Y sigue sin cubrir `for ...: if ...: return`, que es el
segundo y tercer paso de `thyrox_root`.

## Lo que este banco NO cierra

- La forma `for ...: if ...: return` sigue fuera del auditor. Es la tarea
  TASK-DOCS-0426, que este pase NO cierra: lo que se arreglo es la CEGUERA al
  lector, no la cobertura de esa forma.
- `del_entorno` y `derivado` son identificadores en espanol en
  `src/paths/reach.py`, que `identificadores-en-ingles.md` prohibe. El gate
  del proveedor rehusa sobre su propio arbol porque
  `IDENTIFIER_LANGUAGE_BASELINE` no esta declarada. Sucesor: TASK-THYROX-0080.

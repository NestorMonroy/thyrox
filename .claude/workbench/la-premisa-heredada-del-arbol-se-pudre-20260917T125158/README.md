# la-premisa-heredada-del-arbol-se-pudre

## Qué se pregunta

`test_installed_hooks_resolve` fallaba en **su propio control de anulación**:

```
FAIL test_the_two_older_assertions_cannot_see_the_topology
     AssertionError: ['SubagentStart: no existe — …/medir_delta_subagente.py',
                      'SubagentStop:  no existe — …/medir_delta_subagente.py'] != []
```

Ese control existe para probar que las dos aserciones viejas **no ven la
topología**: con el cableado contrario, (a) cae y (b)/(c) no. Su premiso es
«los seis destinos de la otra topología existen» — y esa premisa la **heredaba
del árbol del consumidor**.

Dos lecturas del rojo, con consecuencias distintas:

- **(a)** el archivo se **retiró** — el mecanismo desapareció del consumidor;
- **(b)** el archivo se **renombró** — el mecanismo sigue, con otro nombre.

Las dos dan el mismo ``no existe``, y sólo la segunda dice que la premisa se
pudre por una causa **que va a volver a ocurrir**.

## Qué se midió

`probes/probe_contrary_targets.py`:

```
los tres nombres que la topologia contraria compone bajo h
  False  medir_delta_subagente.py
  True   register_agent_session.py
  True   save-agent-result.mjs

lo que hay de verdad en el hooks del consumidor
  …  measure_subagent_delta.py  …

el cableado VIVO del consumidor
  SubagentStart: python3 .claude/hooks/measure_subagent_delta.py --start
  SubagentStop:  python3 .claude/hooks/measure_subagent_delta.py --stop
```

**(b) confirmada: es un renombre.** ``medir_delta_subagente.py`` →
``measure_subagent_delta.py``, por ``identificadores-en-ingles.md``. El
mecanismo sigue vivo y **el cableado del consumidor es sano** — no hay defecto
de producto en ninguna de las dos capas.

Lo que se pudrió es la **premisa del control**, y por una causa estructural: la
heredaba de un árbol que se renombra.

## El arreglo, y su control

El control **establece** su premisa en vez de heredarla. ``stub_home()`` crea
un directorio bajo el temporal del caso y materializa ahí los tres nombres que
la topología contraria compone bajo ``h``; el instalador de la copia apunta a
ese directorio en vez de a ``<consumidor>/.claude/hooks``.

**El TEXTO contrario no se toca.** Su docstring dice *«no es un incumplidor
fabricado — es el texto que estuvo vivo en el árbol»*, y eso sigue siendo
cierto: lo que se materializa es el **destino**, no el comando. La existencia
del archivo siempre fue incidental a lo que el control mide —que
``missing_files`` es ciego a la topología—; establecerla **aísla** ese eje en
vez de fabricar el caso.

``preModelSwitch.ts`` no necesita stub: va por ``THYROX_DIR``, no por ``h``, y
existe en el árbol del proveedor.

**Anulación quirúrgica:** retirado SOLO el ``touch`` de ``stub_home``, cae
**exactamente una** aserción —la (c), ``missing_files(contrario) == []``— y las
otras tres siguen verdes. ``Ran 4 tests … FAILED (failures=1)``. Ni una más.
Restaurado, las cuatro pasan.

## La clase, y su relación con H-THYROX-48

Es la misma familia con **los lados cambiados**:

.. list-table::

   * - H-THYROX-48
     - el CÓDIGO era rancio y el test decía la verdad
   * - este
     - el código está sano y lo rancio es la **premisa del fixture**

Y la causa raíz de éste es más general que la de aquél: **un control que hereda
su premisa del árbol se pudre con el árbol**. No es un descuido de quien lo
escribió — es una propiedad de la forma.

*Métrica:* existencia de los tres nombres bajo el ``hooks/`` del consumidor,
contra su contenido real y contra el cableado vivo de ``settings.json``.
*Ciega a:* si el renombre dejó otras citas en prosa — medido aparte: la regla
``agent-results-to-docs.md:42`` sigue nombrando el archivo retirado, y es
**TASK-DOCS-0561**, fuera del alcance de este arreglo.

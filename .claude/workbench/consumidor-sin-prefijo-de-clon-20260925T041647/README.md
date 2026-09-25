# Consumidor sin el prefijo de clon del proveedor

Primer consumidor de THYROX cuyo nombre de clon **no** lleva `kaupamex-`:
`ai-course-notes`. Rama `feature/ai-course-notes-l1`, creada desde
`feature/thyrox-l6@bacdb771`.

Reproducir, desde la raiz de thyrox (todo ocurre bajo un `mktemp -d`):

```bash
bash .claude/workbench/consumidor-sin-prefijo-de-clon-*/probes/probe.sh
```

Salida registrada: `outputs/probe.out`.

| Hallazgo | Seccion de la sonda |
|---|---|
| H-THYROX-176 — la familia `THYROX_WORKBENCH_<CLONE>` ignora en silencio la clave de un clon sin prefijo | `## 1` |
| H-THYROX-177 — `root()` compone `<prefijo><repo>` aunque el clon no lo lleve, y `declarations.py` crea esos hogares fantasma, que despues confirman el roster | `## 2` |

## Como se destapo el 177

Al inspeccionar el consumidor con `declarations.py` —que se presenta como
registro de lectura— aparecieron en el host `/home/user/kaupamex-ai-course-notes/`
y `/home/user/kaupamex-thyrox/`, vacios salvo `.claude/workbench/`. En la
invocacion siguiente, sin `THYROX_REACH_ROOTS`, el `ReachRootError` ya no
salia: el roster se derivaba de esos fantasmas. Se borraron (0 archivos) y la
sonda reproduce el ciclo bajo `THYROX_REACH_ROOT=$TMP/reach`.

*Metrica:* salida de `workbench_dir`, `repo_of`, `clone_suffix_of`,
`declarations.py` y `hallazgo_ids.py acunar`, y el `find` de lo que (b) creo.
*Ciega a:* los `.rst` de `kaupamex-docs`, que no estan en este contenedor: los
numeros 176/177 se acunaron contra las filas del store (max 175), no contra el
corpus RST — el acunador mismo no corre aqui, por el 177.

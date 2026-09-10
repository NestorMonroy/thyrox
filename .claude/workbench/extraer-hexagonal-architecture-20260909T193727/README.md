# Extraccion de «Hexagonal Architecture Explained»

Fecha: 2026-09-09T20:16:13
Fuente: PDF de Alistair Cockburn y Juan Manuel Garrido de Paz, aportado por el
ejecutor. Obra **comercial**.

## Por que este banco vive en THYROX y no en el consumidor

Nacio en `kaupamex-docs/.claude/workbench/` y se mudo aqui el mismo dia. La
directiva del ejecutor era explicita —*«el mecanismo … ahora lo tendras que
pasar a `/home/user/thyrox/.claude/workbench/`»*— y su razon es la de siempre:
`extract.py` es MECANISMO, y el mecanismo vive en el productor. Lo que si va al
consumidor es el DOCUMENTO, que esta en
`kaupamex-docs: source/base-cognitiva/hexagonal-architecture/index.rst`.

## Que se versiona: TODO — corregido por el ejecutor

| Pieza | Veredicto |
|---|---|
| `extract.py` | se versiona — es mecanismo reusable |
| `hexagonal-architecture-explained.en.txt` | **se versiona** |

**Mi primera version de este README dijo lo contrario, y estaba mal.** Razone
que el `.txt` integro de una obra comercial no debia entrar, pesando la
licencia como el factor que decide y la reproducibilidad del extractor como
sustituto de la durabilidad. Puse un `.gitignore` local para dejarlo fuera.

Directiva del ejecutor, el mismo dia: *«SI y no nos metemos con eso, como ves
pedimos evidencias y la evidencia siempre se guarda»*.

El `.gitignore` se retiro y el `.txt` entra.

**Por que mi razonamiento fallaba**, que es lo que conviene no repetir: trate
la reproducibilidad como si sustituyera a la evidencia. No lo hace. Un
extractor determinista regenera el texto **mientras el PDF siga estando y el
enlace de `cryptography` siga roto de la misma manera**; las dos condiciones
son del entorno, no del repositorio. Lo que se versiona es la evidencia contra
la que se escribio el analisis, y esa tiene que sobrevivir al entorno — el
mismo criterio con que `build-logs.md` dice que un `.log` es tan durable como
el contenedor.

Y el eje de la licencia estaba mal pesado en su propia direccion: OAIS versiona
su `.txt` y yo lo lei como una excepcion por ser estandar publico. Medido
despues: **no era la excepcion, era la regla del arbol**.

## El mecanismo que `extract.py` aporta

Bloquea el enlace roto de `cryptography` con un buscador propio en
`sys.meta_path` antes de importar el lector de PDF. Sin eso el import muere y la
extraccion no arranca — y el fallo no dice que la causa es un binding ajeno.

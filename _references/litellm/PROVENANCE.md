# `litellm` — procedencia y para qué sirve

Creado: 2026-09-22T23:34:42
Origen: `https://github.com/BerriAI/litellm`, commit
`da82ea8e94b737b7f5873609edf1e842699e5aa2` (el `HEAD` de
`git ls-remote` en esa fecha), descargado archivo por archivo con
`raw.githubusercontent.com`, no clonado.

## Qué contiene

| archivo | por qué |
|---|---|
| `litellm/proxy/proxy_server.py` | control positivo de `tests/verify/test_config_precedence.py` |
| `LICENSE` | la licencia del repositorio en ese commit |

Sha256 (primeros 16) de `proxy_server.py`: `6e329af5abec6425`.

## Por qué vive aquí

`tests/verify/test_config_precedence.py` necesita un archivo REAL donde el
orden de asignación y la rama que gana DISCREPAN: aquí se asigna
`worker_config` antes que `env_config_yaml` y la rama que gana es la de
`env_config_yaml`. La suite lo leía por ruta literal de un clon local
(`/home/user/nestormonroy/litellm`), ausente en cualquier otra sesión, y
fallaba sin haber medido nada. Medido antes de vendorizarlo: el auditor de
thyrox encuentra en este commit exactamente la discrepancia que la suite
afirma.

## Licencia

MIT para todo lo que no está bajo `enterprise/` (ver `LICENSE`). Este
archivo está en `litellm/proxy/`, fuera de `enterprise/`. Es apoyo a la
construcción, no producto de thyrox: nada en `src/` lo importa.

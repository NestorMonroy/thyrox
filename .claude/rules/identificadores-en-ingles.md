# Los identificadores van en inglés; los comentarios, en español

**Todo identificador se escribe en inglés**: nombres de archivo, clases,
funciones, métodos, el nombre de cada parámetro, variables, nombres de test y
**claves de manifiesto** —una clave es un atributo—.

**Los comentarios y docstrings van en español**, sin coloquialismos, con los
términos técnicos en inglés cuando el término es el nombre de la cosa
(`harness`, `scaffold`, `script`, `commit`).

## Traducir no es rebautizar

El trabajo es traducir la palabra, no buscarle un sinónimo mejor: `_Modelo` →
`_Model`, no `_Probe`. Y si la palabra ya está en inglés, **no se toca**: la
regla ataca el español, no la falta de imaginación.

## Un `.py` lleva snake_case porque el nombre ES el módulo

No por autoridad de PEP 8 sino por su razón: `import clean_raw` falla si el
archivo lleva guion medio. Un `.sh` no se importa, así que su separador es
convención local y no la fija esta regla.

    # Cabecera de tabla. Reinicia el estado: un array nunca cruza tablas.
    /^\[/ { in_group = ($0 ~ /^\[dependency-groups\]/); in_arr = 0; next }

    # Apertura de un array de dependencias. Bajo [dependency-groups] toda
    # clave lo es; fuera, solo las que terminan en «dependencies».
    !in_arr && /^[[:space:]]*[A-Za-z0-9_.-]+[[:space:]]*=[[:space:]]*\[/ {
      key = $0; sub(/[[:space:]]*=.*/, "", key); gsub(/[[:space:]]/, "", key)
      if (in_group || key ~ /dependencies$/) in_arr = 1
    }

    in_arr {
      line = $0
      while (match(line, /"[^"]+"/)) {
        spec = substr(line, RSTART + 1, RLENGTH - 2)
        # El nombre es el prefijo hasta el primer caracter que no le
        # pertenece: un marcador, un extra o un especificador de version.
        if (match(spec, /^[A-Za-z0-9._-]+/)) print substr(spec, RSTART, RLENGTH)
        line = substr(line, RSTART + RLENGTH)
      }
      if ($0 ~ /\]/) in_arr = 0
    }

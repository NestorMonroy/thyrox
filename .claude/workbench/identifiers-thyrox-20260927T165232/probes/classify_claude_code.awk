# Clasifica cada sitio CLAUDE_CODE_* por su contexto sintáctico.
{ l=$0; sub(/^[^:]*:[^:]*:/,"",l)
  if (l ~ /(const|let|var) +CLAUDE_CODE_[A-Z0-9_]+ *[=:]/) c="constant-decl"
  else if (l ~ /(process\.)?env(\.|\[)["']?CLAUDE_CODE_|getenv|environ|\$\{?CLAUDE_CODE_|export CLAUDE_CODE_|unset .*CLAUDE_CODE_|CLAUDE_CODE_[A-Z0-9_]+=/) c="env"
  else if (l ~ /["'`]CLAUDE_CODE_[A-Z0-9_]+["'`]/) c="string-literal"
  else c="identifier-use"
  print c "\t" $0 }

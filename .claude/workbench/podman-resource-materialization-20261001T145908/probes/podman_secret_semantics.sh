#!/usr/bin/env bash
# Mide la semántica de `podman secret` en el Podman instalado, sin crear
# contenedores: creación por stdin con etiqueta, formato de inspect, si inspect
# expone el valor, `--replace`, y borrado. Usa un secreto propio y lo retira.
set -uo pipefail
NAME="thyrox-probe-secret-$$"
VALUE="probe-value-$$-$RANDOM"
podman --version
echo "== create desde stdin con etiqueta"
printf '%s' "$VALUE" | podman secret create --label thyrox.secret-digest=abc "$NAME" - ; echo "rc=$?"
echo "== inspect json (¿aparece el valor?)"
podman secret inspect "$NAME" > "$0.inspect.json"; echo "rc=$?"
grep -c "$VALUE" "$0.inspect.json" | sed 's/^/ocurrencias del valor en inspect: /'
grep -oE '"(Name|Labels|Driver)"[^,]*' "$0.inspect.json" | head
echo "== inspect --format"
podman secret inspect --format '{{.Spec.Name}}|{{index .Spec.Labels "thyrox.secret-digest"}}' "$NAME"; echo "rc=$?"
echo "== create repetido sin --replace"
printf '%s' "$VALUE" | podman secret create "$NAME" - 2>&1; echo "rc=$?"
echo "== create --replace"
printf '%s' "$VALUE-2" | podman secret create --replace --label thyrox.secret-digest=def "$NAME" - 2>&1; echo "rc=$?"
podman secret inspect --format '{{index .Spec.Labels "thyrox.secret-digest"}}' "$NAME"
echo "== inspect de un secreto ausente"
podman secret inspect thyrox-probe-absent-$$ >/dev/null 2>&1; echo "rc=$?"
echo "== rm"
podman secret rm "$NAME"; echo "rc=$?"
rm -f "$0.inspect.json"

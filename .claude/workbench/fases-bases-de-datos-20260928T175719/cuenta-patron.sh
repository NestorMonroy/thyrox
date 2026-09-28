#!/usr/bin/env bash
# Cuenta los archivos versionados de un repo que nombran un patron ERE.
# uso: cuenta-patron.sh <repo> <patron>
printf '%s\t%s\n' "$2" "$(git -C "$1" grep -liE -e "$2" | wc -l)"

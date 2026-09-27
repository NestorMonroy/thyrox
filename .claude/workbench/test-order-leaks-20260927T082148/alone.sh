#!/usr/bin/env bash
# La víctima SOLA, con el orden de sus pruebas barajado por la semilla.
victim="$1"; seed="$2"
fails=$(bun test "$victim" --randomize --seed="$seed" 2>&1 | grep -c '^(fail)')
printf '%s\t%s\t%s\n' "$victim" "$seed" "$fails"

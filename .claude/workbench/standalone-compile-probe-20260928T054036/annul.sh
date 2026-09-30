#!/usr/bin/env bash
# Anulaciones del porte de la forma de apendice: retirada cada mitad, caen
# exactamente las aserciones que dependen de ella.
set -u
cd "$(dirname "$0")/../../../src/packages/binary" || exit 2
export PYTHONDONTWRITEBYTECODE=1
run() { bun test __tests__/payloadLocation.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'; }
echo "== base"; run
cp src/payload.ts src/payload.ts.orig
sed -i 's/^  return locateAppended(bytes)$/  return null/' src/payload.ts
echo "== anulada: la rama de apendice"; run
mv src/payload.ts.orig src/payload.ts
cp src/elf.ts src/elf.ts.orig
sed -i 's/^  if (shoff + shnum \* shentsize > bytes.length || shstrndx >= shnum) return null$//; s/ || bytes.length < ELF64_HEADER_BYTES) return null/) return null/' src/elf.ts
echo "== anulada: los limites del encabezado ELF"; run
mv src/elf.ts.orig src/elf.ts
echo "== restaurado"; run
git diff --stat -- src/payload.ts src/elf.ts | tail -1

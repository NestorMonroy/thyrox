"""El estrechamiento en positivo: tsc no descarta la variante de error con dos igualdades negadas."""
from pathlib import Path

path = Path("/home/user/thyrox/src/packages/local-models/catalogCommand.ts")
old = """  if (outcome.status === 'rejected' || outcome.status === 'failed') {
    context.output.stderr(`local-models-catalog: ${name} no se adoptó (${outcome.status}): ${outcome.reason}`)
    return EXIT_NOT_APPROVED
  }
  context.output.stdout(`${outcome.status === 'adopted' ? 'adoptado' : 'ya en caché'}: ${name} → ${outcome.path}`)
  return EXIT_OK
"""
new = """  if (outcome.status === 'adopted' || outcome.status === 'cached') {
    context.output.stdout(`${outcome.status === 'adopted' ? 'adoptado' : 'ya en caché'}: ${name} → ${outcome.path}`)
    return EXIT_OK
  }
  context.output.stderr(`local-models-catalog: ${name} no se adoptó (${outcome.status}): ${outcome.reason}`)
  return EXIT_NOT_APPROVED
"""
text = path.read_text(encoding="utf-8")
assert text.count(old) == 1
path.write_text(text.replace(old, new), encoding="utf-8")
# Lo mismo en el guion de aplicación, para que el banco reproduzca el estado final.
impl = Path(__file__).with_name("impl.py")
impl.write_text(impl.read_text(encoding="utf-8").replace(old.replace("\\", "\\\\"), new.replace("\\", "\\\\")), encoding="utf-8")

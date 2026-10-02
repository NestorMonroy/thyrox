from pathlib import Path
p = Path('src/packages/podman-execution/executionCommand.ts'); s = p.read_text()
pairs = [
("""  '     podman-execution-execute build-image --task TASK-<CAPA>-NNNN --context DIR --tag TAG [--containerfile F] [--network host]',""",
 """  '     podman-execution-execute build-image (--task TASK-<CAPA>-NNNN | --work CONSUMIDOR:ID) --context DIR --tag TAG [--containerfile F] [--network host]',"""),
("""    options: {
      task: { type: 'string' },
      context: { type: 'string' },""",
 """    options: {
      task: { type: 'string' },
      work: { type: 'string' },
      context: { type: 'string' },"""),
("""  const task = requireValue(values.task, 'task')
  const network = parseNetwork(values.network)""",
 """  // Un consumidor construye su imagen de ejecución bajo su propia referencia de trabajo.
  const reference = referenceOf(values.task, values.work)
  const network = parseNetwork(values.network)"""),
("""    labels: { 'thyrox.task': task, [IMAGE_LIFECYCLE_LABEL]: 'cache' },""",
 """    labels: { ...imageReferenceLabels(reference), [IMAGE_LIFECYCLE_LABEL]: 'cache' },"""),
("""function referenceText(reference: ExecutionReference): string {""",
 """/** La etiqueta que cita a quién pertenece la imagen: la de hoy para una tarea, la referencia para un consumidor. */
function imageReferenceLabels(reference: ExecutionReference): Record<string, string> {
  if (reference.kind === 'task') return { 'thyrox.task': reference.citation }
  return { [EXECUTION_REFERENCE_LABEL_KEY]: referenceText(reference).replace('=', ':') }
}

function referenceText(reference: ExecutionReference): string {"""),
]
for old, new in pairs:
    assert s.count(old) == 1, old[:60]; s = s.replace(old, new)
if 'EXECUTION_REFERENCE_LABEL_KEY' not in s.split('function imageReferenceLabels')[0]:
    old = "import { runExecution, InvalidExecutionAuthorizationError,"
    assert s.count(old) == 1
    s = s.replace(old, "import { EXECUTION_REFERENCE_LABEL_KEY, runExecution, InvalidExecutionAuthorizationError,")
p.write_text(s); print('ok')

# Puntúa cada nota por los ejes de thyrox presentes en su ruta y sus secciones.
BEGIN {
  FS = "\t"; IGNORECASE = 1
  eje["agente"]      = "agent|智能体|代理|agentic"
  eje["harness"]     = "harness|scaffold|claude code|codex|cursor|coding agent|编程|coding"
  eje["herramienta"] = "tool|工具|function call|mcp"
  eje["contexto"]    = "context|上下文|compaction|压缩|long context|长上下文"
  eje["memoria"]     = "memory|记忆|cache|缓存|kv"
  eje["evaluacion"]  = "eval|评测|评估|benchmark|verif|验证|test|测试"
  eje["costo"]       = "token|cost|成本|inference|推理|speculative|投机|perplexity|困惑度"
  eje["orquestacion"]= "multi-agent|多智能体|subagent|子代理|orchestr|编排|parallel|并行|workflow|工作流"
  eje["prompt"]      = "prompt|提示"
  eje["seguridad"]   = "safety|安全|alignment|对齐|permission|权限|sandbox|沙箱"
}
{
  texto = $1 " " $3; puntos = 0; tocados = ""
  for (e in eje) if (texto ~ eje[e]) { puntos++; tocados = tocados " " e }
  if (puntos > 0) print puntos "\t" $1 "\t" tocados
}

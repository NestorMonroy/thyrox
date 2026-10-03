#!/usr/bin/env bash
# EXPERIMENTAL — medición exploratoria: ¿llegan los saltos de línea de un
# argumento de herramienta desde el /v1 de Ollama? Pide a la unidad que escriba
# un archivo de tres líneas con la herramienta Bash e imprime los `arguments`
# crudos de la primera tool_call. Uso: multiline_tool_call.sh <puerto> <modelo>
port="$1" model="$2"
body=$(jq -nc --arg model "$model" '{model:$model, reasoning_effort:"none", max_tokens:300,
  tools:[{type:"function",function:{name:"Bash",description:"Run a bash command",parameters:{type:"object",properties:{command:{type:"string"}},required:["command"]}}}],
  messages:[{role:"user",content:"Use the Bash tool to create the file /tmp/x.py with a heredoc. The file must contain exactly three lines: import sys, print(1), print(2)."}]}')
curl -s --max-time 900 "127.0.0.1:$port/v1/chat/completions" -H 'content-type: application/json' -d "$body" \
  | jq -r '.choices[0].message.tool_calls[0].function.arguments // ("SIN TOOL CALL: " + (.choices[0].message.content // .error.message // "?"))'

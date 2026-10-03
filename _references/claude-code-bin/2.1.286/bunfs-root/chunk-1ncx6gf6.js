// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{c}from"/$bunfs/root/chunk-dwaez71m.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";import{oe}from"/$bunfs/root/chunk-qrvgaype.js";import{hs}from"/$bunfs/root/chunk-dddcacc2.js";import{readdir as p}from"fs/promises";function d(){return import("/$bunfs/root/chunk-60ybkpst.js")}function h(o){let t={};for(let[e,r]of Object.entries(o.SKILL_FILES))t[e]=e.endsWith(".md")?s(r,o.SKILL_MODEL_VARS):r;return t}var g={python:[".py","requirements.txt","pyproject.toml","setup.py","Pipfile"],typescript:[".ts",".tsx","tsconfig.json","package.json"],java:[".java","pom.xml","build.gradle"],go:[".go","go.mod"],ruby:[".rb","Gemfile"],csharp:[".cs",".csproj"],php:[".php","composer.json"],curl:[]};async function m(){let o=oe(),t;try{t=await p(o)}catch{return null}for(let[e,r]of Object.entries(g)){if(r.length===0)continue;for(let n of r)if(n.startsWith(".")){if(t.some((a)=>a.endsWith(n)))return e}else if(t.includes(n))return e}return null}function s(o,t){let e=o,r;do r=e,e=e.replace(/<!--[\s\S]*?-->\n?/g,"");while(e!==r);return e=e.replace(/\{\{(\w+)\}\}/g,(n,a)=>Object.hasOwn(t,a)?t[a]??n:n),e}function f(o,t,e,r){let n=[s(e.SKILL_PROMPT,e.SKILL_MODEL_VARS).trimEnd()];if(!r)n.push(`## Reference Files Unavailable

This skill's reference files could not be written to disk for this session, so the \`{lang}/\u2026\`, \`shared/\u2026\`, and \`curl/\u2026\` files cited above cannot be Read. Do not guess their contents \u2014 WebFetch the matching URL from \`shared/live-sources.md\`, included below, whenever the Reading Guide points at one of those files. If a cited \`shared/\u2026\` file has no matching URL below (skill-authored guides such as \`shared/prompt-audit.md\`, \`shared/agent-design.md\`, \`shared/platform-availability.md\`), state that the reference is unavailable this session and proceed best-effort from this document.

<doc path="shared/live-sources.md">
${s(e.SKILL_FILES["shared/live-sources.md"]??"",e.SKILL_MODEL_VARS).trim()}
</doc>`);if(o){let a=`${o}/claude-api/README.md`,l=e.SKILL_FILES[a];if(l)n.push(`## Detected Language: ${o}

\`${a}\` is included below since every task starts there.${r?" Read the other referenced files from the base directory on demand. That directory is session-scoped \u2014 after resuming a session, or if a Read under it ever fails, re-invoke this skill to re-extract.":""}

<doc path="${a}">
${s(l,e.SKILL_MODEL_VARS).trim()}
</doc>`)}else if(TKt(t)!=="prompt-audit")n.push(r?"No project language was auto-detected. Ask the user which language they are using (see Language Detection above), then Read the matching `{lang}/claude-api/README.md` (or `curl/examples.md` for cURL/raw HTTP or an unsupported language) from the base directory before anything else.":"No project language was auto-detected. Ask the user which language they are using (see Language Detection above) before writing code.");if(t)n.push(`## User Request

${t}`);return n.join(`

`)}var L=["Reference for the Claude API / Anthropic SDK \u2014 model ids, pricing, params, streaming, tool use, MCP, agents, caching, token counting, model migration.",'TRIGGER \u2014 read BEFORE opening the target file; don\'t skip because it "looks like a one-liner" \u2014 whenever: the prompt names Claude/Anthropic in any form (Claude, Anthropic, Fable, Opus, Sonnet, Haiku, `anthropic`, `@anthropic-ai`, `claude-*`, `us.anthropic.*`, `[1m]`); the user asks about an LLM (pricing/model choice/limits/caching) \u2014 never answer from memory; OR the task is LLM-shaped with provider unstated (agent/MCP/tool-definition/multi-agent/RAG/LLM-judge/computer-use; generate/summarize/extract/classify/rewrite/converse over NL; debugging refusals/cutoffs/streaming/tool-calls/tokens).',"SKIP only when another provider is being worked on (overrides all triggers): OpenAI/GPT/Gemini/Llama/Mistral/Cohere/Ollama named in the query; OR `grep -rE 'openai|langchain_openai|google.generativeai|genai|mistralai|cohere|ollama'` over the project hits (run this grep FIRST if no provider named \u2014 don't Read the file)."].join(`
`),u=["cost-optimize","migrate","managed-agents-onboard","prompt-audit","upgrade","build-eval","hillclimb","preserved-thinking-migration"];function TKt(o){let t=o.trim().toLowerCase().split(/\s+/)[0]??"";return u.find((e)=>e===t)??"none"}function KXo({disabled:o=!1}={}){hs({name:"claude-api",menuDescription:"Build and debug apps that use the Claude API",description:L,allowedTools:["WebFetch(domain:platform.claude.com)"],userInvocable:!0,disableBridgeInvocation:!0,isEnabled:()=>!o,files:()=>d().then(h),async getPromptForCommand(t,e,r){let[n,a]=await Promise.all([m(),d()]);return i("tengu_claude_api_skill_loaded",{detected_lang:c(n??"none"),subcommand:c(TKt(t)),has_args:t.trim().length>0}),[{type:"text",text:f(n,t,a,typeof r==="string")}]},async getArgumentCompletions(t,e){if(t.length>0)return[];let r=e.toLowerCase();return u.filter((n)=>n.startsWith(r)).map((n)=>({value:n,displayValue:n}))}})}
export{TKt,KXo};

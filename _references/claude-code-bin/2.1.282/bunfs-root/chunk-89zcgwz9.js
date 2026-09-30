// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Oe}from"/$bunfs/root/chunk-zt13kgz5.js";import{cr,KD}from"/$bunfs/root/chunk-x80cfbm0.js";import{gLt}from"/$bunfs/root/chunk-e8ycfccz.js";import{e9t,ta}from"/$bunfs/root/chunk-c9jscxk0.js";import{vo}from"/$bunfs/root/chunk-tndz0yes.js";function g2t(t){let a=y(t);if(a===null)return null;let o=cr(t.totalTokens-t.rawMaxTokens),i=cr(t.rawMaxTokens);if(a==="hard_limit"){let p=Oe(process.env.DISABLE_COMPACT)?"/clear":"/compact or /clear";return`Context exceeds the ${i}-token limit by ${o} tokens \u2014 run ${p} to continue.`}let m=Oe(process.env.DISABLE_COMPACT)?"/clear":"/compact";return`Context is ${o} tokens past the ${i}-token compaction window \u2014 run ${m} to reduce usage.`}function y(t){if(t.totalTokens<=t.rawMaxTokens)return null;return t.autocompactSource==="auto"?"hard_limit":"compaction_window"}function h2t(t){let{categories:a,totalTokens:o,rawMaxTokens:i,percentage:m,model:p,memoryFiles:u,mcpTools:k,agents:g,skills:l,messageBreakdown:d,systemTools:f,systemPromptSections:T}=t,e=`## Context Usage

`;e+=`**Model:** ${p}  
`,e+=`**Tokens:** ${cr(o)} / ${cr(i)} (${m}%)
`;let c=g2t(t);if(c)e+=`**Over limit:** ${c}
`;e+=`
`;let x=a.filter((n)=>n.tokens>0&&n.name!=="Free space"&&n.name!=="Autocompact buffer");if(x.length>0){e+=`### Estimated usage by category

`,e+=`| Category | Tokens | Percentage |
`,e+=`|----------|--------|------------|
`;for(let r of x){let C=(r.tokens/i*100).toFixed(1);e+=`| ${r.name} | ${cr(r.tokens)} | ${C}% |
`}let n=a.find((r)=>r.name==="Free space");if(n&&n.tokens>0){let r=(n.tokens/i*100).toFixed(1);e+=`| Free space | ${cr(n.tokens)} | ${r}% |
`}let s=a.find((r)=>r.name==="Autocompact buffer");if(s&&s.tokens>0){let r=(s.tokens/i*100).toFixed(1);e+=`| Autocompact buffer | ${cr(s.tokens)} | ${r}% |
`}e+=`
`}if(k.length>0){e+=`### MCP Tools

`,e+=`| Tool | Server | Tokens |
`,e+=`|------|--------|--------|
`;for(let n of k)e+=`| ${n.name} | ${n.serverName} | ${cr(n.tokens)} |
`;e+=`
`}if(f&&f.length>0,T&&T.length>0,g.length>0){e+=`### Custom Agents

`,e+=`| Agent Type | Source | Tokens |
`,e+=`|------------|--------|--------|
`;for(let n of g){let s;switch(n.source){case"projectSettings":s="Project";break;case"userSettings":s="User";break;case"localSettings":s="Local";break;case"flagSettings":s="Flag";break;case"policySettings":s="Policy";break;case"plugin":s="Plugin";break;case"built-in":s="Built-in";break;default:s=String(n.source)}e+=`| ${n.agentType} | ${s} | ${cr(n.tokens)} |
`}e+=`
`}if(u.length>0){e+=`### Memory Files

`,e+=`| Type | Path | Tokens |
`,e+=`|------|------|--------|
`;for(let n of u)e+=`| ${n.type} | ${n.path} | ${cr(n.tokens)} |
`;e+=`
`}if(l&&l.tokens>0&&l.skillFrontmatter.length>0){e+=`### Skills

`,e+=`| Skill | Source | Tokens |
`,e+=`|-------|--------|--------|
`;for(let n of l.skillFrontmatter){let s=gLt(n.source)+(n.pluginName?` (${n.pluginName})`:"");e+=`| ${n.name} | ${s} | ${KD(n.tokens)} |
`}e+=`
`}return e}async function AJ(t){let{session:a,messages:o,getAppState:i,options:{mainLoopModel:m,tools:p,agentDefinitions:u,customSystemPrompt:k,appendSystemPrompt:g,systemPromptSnapshot:l,excludeDynamicSections:d},detail:f,terminalWidth:T}=t,e=ta(o),c=i();return e9t(e,m,async()=>c.toolPermissionContext,p,u,{session:a,toolUseContext:{options:{customSystemPrompt:k,appendSystemPrompt:g,systemPromptSnapshot:l},getMcp:t.getMcp,storageV5:t.storageV5,credentials:t.credentials},originalMessages:e,configuredWindow:c.autoCompactWindow,excludeDynamicSections:d,detail:f,terminalWidth:T})}async function wUo(t,a){let o=await AJ(a),m=vo(a.session)?{...o,memoryFiles:[]}:o;return{type:"text",value:h2t(m),contextUsage:P0o(m)}}function P0o(t){let a=y(t);return{model:t.model,total_tokens:t.totalTokens,raw_max_tokens:t.rawMaxTokens,percentage:t.percentage,...a!==null&&{over_limit:{tokens_over:t.totalTokens-t.rawMaxTokens,kind:a}},categories:t.categories.map((o)=>({name:o.name,tokens:o.tokens,kind:o.kind})),mcp_tools:t.mcpTools.map((o)=>({name:o.name,server_name:o.serverName,tokens:o.tokens})),memory_files:t.memoryFiles.map((o)=>({path:o.path,type:o.type,tokens:o.tokens})),agents:t.agents.map((o)=>({agent_type:o.agentType,source:o.source,tokens:o.tokens})),...t.skills&&t.skills.skillFrontmatter.length>0&&{skills:t.skills.skillFrontmatter.map((o)=>({name:o.name,source:o.source,...o.pluginName!==void 0&&{plugin_name:o.pluginName},tokens:o.tokens}))}}}
export{g2t,h2t,AJ,wUo,P0o};

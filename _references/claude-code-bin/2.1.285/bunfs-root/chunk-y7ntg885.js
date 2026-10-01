// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Le}from"/$bunfs/root/chunk-fkak21hw.js";import{gr,AN}from"/$bunfs/root/chunk-aqx56v12.js";import{JBt}from"/$bunfs/root/chunk-xzfbbx57.js";import{sen,Qi}from"/$bunfs/root/chunk-qazw855w.js";import{Po}from"/$bunfs/root/chunk-bh259tfr.js";function T3t(t){let a=C(t);if(a===null)return null;let o=gr(t.totalTokens-t.rawMaxTokens),i=gr(t.rawMaxTokens);if(a==="hard_limit"){let p=Le(process.env.DISABLE_COMPACT)?"/clear":"/compact or /clear";return`Context exceeds the ${i}-token limit by ${o} tokens \u2014 run ${p} to continue.`}let m=Le(process.env.DISABLE_COMPACT)?"/clear":"/compact";return`Context is ${o} tokens past the ${i}-token compaction window \u2014 run ${m} to reduce usage.`}function C(t){if(t.totalTokens<=t.rawMaxTokens)return null;return t.autocompactSource==="auto"?"hard_limit":"compaction_window"}function A3t(t){let{categories:a,totalTokens:o,rawMaxTokens:i,percentage:m,model:p,memoryFiles:k,mcpTools:g,agents:f,skills:l,messageBreakdown:d,systemTools:T,systemPromptSections:y}=t,e=`## Context Usage

`;e+=`**Model:** ${p}  
`,e+=`**Tokens:** ${gr(o)} / ${gr(i)} (${m}%)
`;let c=T3t(t);if(c)e+=`**Over limit:** ${c}
`;e+=`
`;let u=a.filter((n)=>n.tokens>0&&n.name!=="Free space"&&n.name!=="Autocompact buffer");if(u.length>0){e+=`### Estimated usage by category

`,e+=`| Category | Tokens | Percentage |
`,e+=`|----------|--------|------------|
`;for(let r of u){let x=(r.tokens/i*100).toFixed(1);e+=`| ${r.name} | ${gr(r.tokens)} | ${x}% |
`}let n=a.find((r)=>r.name==="Free space");if(n&&n.tokens>0){let r=(n.tokens/i*100).toFixed(1);e+=`| Free space | ${gr(n.tokens)} | ${r}% |
`}let s=a.find((r)=>r.name==="Autocompact buffer");if(s&&s.tokens>0){let r=(s.tokens/i*100).toFixed(1);e+=`| Autocompact buffer | ${gr(s.tokens)} | ${r}% |
`}e+=`
`}if(g.length>0){e+=`### MCP Tools

`,e+=`| Tool | Server | Tokens |
`,e+=`|------|--------|--------|
`;for(let n of g)e+=`| ${n.name} | ${n.serverName} | ${gr(n.tokens)} |
`;e+=`
`}if(T&&T.length>0,y&&y.length>0,f.length>0){e+=`### Custom Agents

`,e+=`| Agent Type | Source | Tokens |
`,e+=`|------------|--------|--------|
`;for(let n of f){let s;switch(n.source){case"projectSettings":s="Project";break;case"userSettings":s="User";break;case"localSettings":s="Local";break;case"flagSettings":s="Flag";break;case"policySettings":s="Policy";break;case"plugin":s="Plugin";break;case"built-in":s="Built-in";break;default:s=String(n.source)}e+=`| ${n.agentType} | ${s} | ${gr(n.tokens)} |
`}e+=`
`}if(k.length>0){e+=`### Memory Files

`,e+=`| Type | Path | Tokens |
`,e+=`|------|------|--------|
`;for(let n of k)e+=`| ${n.type} | ${n.path} | ${gr(n.tokens)} |
`;e+=`
`}if(l&&l.tokens>0&&l.skillFrontmatter.length>0){e+=`### Skills

`,e+=`| Skill | Source | Tokens |
`,e+=`|-------|--------|--------|
`;for(let n of l.skillFrontmatter){let s=JBt(n.source)+(n.pluginName?` (${n.pluginName})`:"");e+=`| ${n.name} | ${s} | ${AN(n.tokens)} |
`}e+=`
`}return e}async function BQ(t){let{session:a,messages:o,getAppState:i,options:{mainLoopModel:m,tools:p,agentDefinitions:k,customSystemPrompt:g,appendSystemPrompt:f,systemPromptSnapshot:l,excludeDynamicSections:d,mcpClients:T},detail:y,terminalWidth:e}=t,c=Qi(o),u=i();return sen(c,m,async()=>u.toolPermissionContext,p,k,{session:a,toolUseContext:{options:{customSystemPrompt:g,appendSystemPrompt:f,systemPromptSnapshot:l,mcpClients:T},getMcp:t.getMcp,storageV5:t.storageV5,credentials:t.credentials},originalMessages:c,configuredWindow:u.autoCompactWindow,excludeDynamicSections:d,detail:y,terminalWidth:e})}async function HYo(t,a){let o=await BQ(a),m=Po(a.session)?{...o,memoryFiles:[]}:o;return{type:"text",value:A3t(m),contextUsage:xVo(m)}}function xVo(t){let a=C(t);return{model:t.model,total_tokens:t.totalTokens,raw_max_tokens:t.rawMaxTokens,percentage:t.percentage,...a!==null&&{over_limit:{tokens_over:t.totalTokens-t.rawMaxTokens,kind:a}},categories:t.categories.map((o)=>({name:o.name,tokens:o.tokens,kind:o.kind})),mcp_tools:t.mcpTools.map((o)=>({name:o.name,server_name:o.serverName,tokens:o.tokens})),memory_files:t.memoryFiles.map((o)=>({path:o.path,type:o.type,tokens:o.tokens})),agents:t.agents.map((o)=>({agent_type:o.agentType,source:o.source,tokens:o.tokens})),...t.skills&&t.skills.skillFrontmatter.length>0&&{skills:t.skills.skillFrontmatter.map((o)=>({name:o.name,source:o.source,...o.pluginName!==void 0&&{plugin_name:o.pluginName},tokens:o.tokens}))}}}
export{T3t,A3t,BQ,HYo,xVo};

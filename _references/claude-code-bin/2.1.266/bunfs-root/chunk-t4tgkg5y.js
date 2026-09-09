// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{He}from"/$bunfs/root/chunk-a7esebzw.js";import{Vxt}from"/$bunfs/root/chunk-hfjb09vk.js";import{GYn,A_t,Bi}from"/$bunfs/root/chunk-yw4jc948.js";import{Dn,tI}from"/$bunfs/root/chunk-ydsbq05f.js";import{uo}from"/$bunfs/root/chunk-acr4qh6y.js";function Jut(o){let r=C(o);if(r===null)return null;let t=Dn(o.totalTokens-o.rawMaxTokens),l=Dn(o.rawMaxTokens);if(r==="hard_limit"){let m=He(process.env.DISABLE_COMPACT)?"/clear":"/compact or /clear";return`Context exceeds the ${l}-token limit by ${t} tokens \u2014 run ${m} to continue.`}let i=He(process.env.DISABLE_COMPACT)?"/clear":"/compact";return`Context is ${t} tokens past the ${l}-token compaction window \u2014 run ${i} to reduce usage.`}function C(o){if(o.totalTokens<=o.rawMaxTokens)return null;return o.autocompactSource==="auto"?"hard_limit":"compaction_window"}function Qut(o,r){let{categories:t,totalTokens:l,rawMaxTokens:i,percentage:m,model:T,memoryFiles:g,mcpTools:k,agents:f,skills:p,messageBreakdown:y,systemTools:c,systemPromptSections:u}=o,e=`## Context Usage

`;e+=`**Model:** ${T}  
`,e+=`**Tokens:** ${Dn(l)} / ${Dn(i)} (${m}%)
`;let d=Jut(o);if(d)e+=`**Over limit:** ${d}
`;e+=`
`;let x=t.filter((n)=>n.tokens>0&&n.name!=="Free space"&&n.name!=="Autocompact buffer");if(x.length>0){e+=`### Estimated usage by category

`,e+=`| Category | Tokens | Percentage |
`,e+=`|----------|--------|------------|
`;for(let a of x){let S=(a.tokens/i*100).toFixed(1);e+=`| ${a.name} | ${Dn(a.tokens)} | ${S}% |
`}let n=t.find((a)=>a.name==="Free space");if(n&&n.tokens>0){let a=(n.tokens/i*100).toFixed(1);e+=`| Free space | ${Dn(n.tokens)} | ${a}% |
`}let s=t.find((a)=>a.name==="Autocompact buffer");if(s&&s.tokens>0){let a=(s.tokens/i*100).toFixed(1);e+=`| Autocompact buffer | ${Dn(s.tokens)} | ${a}% |
`}e+=`
`}if(k.length>0){e+=`### MCP Tools

`,e+=`| Tool | Server | Tokens |
`,e+=`|------|--------|--------|
`;for(let n of k)e+=`| ${n.name} | ${n.serverName} | ${Dn(n.tokens)} |
`;e+=`
`}if(c&&c.length>0,u&&u.length>0,f.length>0){e+=`### Custom Agents

`,e+=`| Agent Type | Source | Tokens |
`,e+=`|------------|--------|--------|
`;for(let n of f){let s;switch(n.source){case"projectSettings":s="Project";break;case"userSettings":s="User";break;case"localSettings":s="Local";break;case"flagSettings":s="Flag";break;case"policySettings":s="Policy";break;case"plugin":s="Plugin";break;case"built-in":s="Built-in";break;default:s=String(n.source)}e+=`| ${n.agentType} | ${s} | ${Dn(n.tokens)} |
`}e+=`
`}if(g.length>0){e+=`### Memory Files

`,e+=`| Type | Path | Tokens |
`,e+=`|------|------|--------|
`;for(let n of g)e+=`| ${n.type} | ${n.path} | ${Dn(n.tokens)} |
`;e+=`
`}if(p&&p.tokens>0&&p.skillFrontmatter.length>0){e+=`### Skills

`,e+=`| Skill | Source | Tokens |
`,e+=`|-------|--------|--------|
`;for(let n of p.skillFrontmatter){let s=Vxt(n.source)+(n.pluginName?` (${n.pluginName})`:"");e+=`| ${n.name} | ${s} | ${tI(n.tokens)} |
`}e+=`
`}return e}async function TMe(o){let{session:r,messages:t,getAppState:l,options:{mainLoopModel:i,tools:m,agentDefinitions:T,customSystemPrompt:g,appendSystemPrompt:k,systemPromptSnapshot:f,excludeDynamicSections:p},detail:y}=o,c=Bi(t),u=l();return A_t(c,i,async()=>u.toolPermissionContext,m,T,{session:r,toolUseContext:{options:{customSystemPrompt:g,appendSystemPrompt:k,systemPromptSnapshot:f},getMcp:o.getMcp,storageV5:o.storageV5,credentials:o.credentials},originalMessages:c,configuredWindow:u.autoCompactWindow,excludeDynamicSections:p,detail:y})}async function KSr(o,r){let t=await TMe(r),l=uo(r.session),i=l?{...t,memoryFiles:[]}:t;return{type:"text",value:Qut(i,{skipCollapseStatus:l}),contextUsage:Jhr(i)}}function Jhr(o){let r=C(o);return{model:o.model,total_tokens:o.totalTokens,raw_max_tokens:o.rawMaxTokens,percentage:o.percentage,...r!==null&&{over_limit:{tokens_over:o.totalTokens-o.rawMaxTokens,kind:r}},categories:o.categories.map((t)=>({name:t.name,tokens:t.tokens,kind:GYn(t)})),mcp_tools:o.mcpTools.map((t)=>({name:t.name,server_name:t.serverName,tokens:t.tokens})),memory_files:o.memoryFiles.map((t)=>({path:t.path,type:t.type,tokens:t.tokens})),agents:o.agents.map((t)=>({agent_type:t.agentType,source:t.source,tokens:t.tokens})),...o.skills&&o.skills.skillFrontmatter.length>0&&{skills:o.skills.skillFrontmatter.map((t)=>({name:t.name,source:t.source,...t.pluginName!==void 0&&{plugin_name:t.pluginName},tokens:t.tokens}))}}}
export{Jut,Qut,TMe,KSr,Jhr};

// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Oe}from"/$bunfs/root/chunk-4a5nddj6.js";import{ur,bD}from"/$bunfs/root/chunk-a22am1vw.js";import{$0t}from"/$bunfs/root/chunk-3hxvvnfw.js";import{$3t,Xi}from"/$bunfs/root/chunk-4n4g22z6.js";import{bo}from"/$bunfs/root/chunk-572czx65.js";function TWt(t){let a=y(t);if(a===null)return null;let o=ur(t.totalTokens-t.rawMaxTokens),i=ur(t.rawMaxTokens);if(a==="hard_limit"){let p=Oe(process.env.DISABLE_COMPACT)?"/clear":"/compact or /clear";return`Context exceeds the ${i}-token limit by ${o} tokens \u2014 run ${p} to continue.`}let m=Oe(process.env.DISABLE_COMPACT)?"/clear":"/compact";return`Context is ${o} tokens past the ${i}-token compaction window \u2014 run ${m} to reduce usage.`}function y(t){if(t.totalTokens<=t.rawMaxTokens)return null;return t.autocompactSource==="auto"?"hard_limit":"compaction_window"}function AWt(t){let{categories:a,totalTokens:o,rawMaxTokens:i,percentage:m,model:p,memoryFiles:u,mcpTools:k,agents:g,skills:l,messageBreakdown:d,systemTools:f,systemPromptSections:T}=t,e=`## Context Usage

`;e+=`**Model:** ${p}  
`,e+=`**Tokens:** ${ur(o)} / ${ur(i)} (${m}%)
`;let c=TWt(t);if(c)e+=`**Over limit:** ${c}
`;e+=`
`;let x=a.filter((n)=>n.tokens>0&&n.name!=="Free space"&&n.name!=="Autocompact buffer");if(x.length>0){e+=`### Estimated usage by category

`,e+=`| Category | Tokens | Percentage |
`,e+=`|----------|--------|------------|
`;for(let r of x){let C=(r.tokens/i*100).toFixed(1);e+=`| ${r.name} | ${ur(r.tokens)} | ${C}% |
`}let n=a.find((r)=>r.name==="Free space");if(n&&n.tokens>0){let r=(n.tokens/i*100).toFixed(1);e+=`| Free space | ${ur(n.tokens)} | ${r}% |
`}let s=a.find((r)=>r.name==="Autocompact buffer");if(s&&s.tokens>0){let r=(s.tokens/i*100).toFixed(1);e+=`| Autocompact buffer | ${ur(s.tokens)} | ${r}% |
`}e+=`
`}if(k.length>0){e+=`### MCP Tools

`,e+=`| Tool | Server | Tokens |
`,e+=`|------|--------|--------|
`;for(let n of k)e+=`| ${n.name} | ${n.serverName} | ${ur(n.tokens)} |
`;e+=`
`}if(f&&f.length>0,T&&T.length>0,g.length>0){e+=`### Custom Agents

`,e+=`| Agent Type | Source | Tokens |
`,e+=`|------------|--------|--------|
`;for(let n of g){let s;switch(n.source){case"projectSettings":s="Project";break;case"userSettings":s="User";break;case"localSettings":s="Local";break;case"flagSettings":s="Flag";break;case"policySettings":s="Policy";break;case"plugin":s="Plugin";break;case"built-in":s="Built-in";break;default:s=String(n.source)}e+=`| ${n.agentType} | ${s} | ${ur(n.tokens)} |
`}e+=`
`}if(u.length>0){e+=`### Memory Files

`,e+=`| Type | Path | Tokens |
`,e+=`|------|------|--------|
`;for(let n of u)e+=`| ${n.type} | ${n.path} | ${ur(n.tokens)} |
`;e+=`
`}if(l&&l.tokens>0&&l.skillFrontmatter.length>0){e+=`### Skills

`,e+=`| Skill | Source | Tokens |
`,e+=`|-------|--------|--------|
`;for(let n of l.skillFrontmatter){let s=$0t(n.source)+(n.pluginName?` (${n.pluginName})`:"");e+=`| ${n.name} | ${s} | ${bD(n.tokens)} |
`}e+=`
`}return e}async function PX(t){let{session:a,messages:o,getAppState:i,options:{mainLoopModel:m,tools:p,agentDefinitions:u,customSystemPrompt:k,appendSystemPrompt:g,systemPromptSnapshot:l,excludeDynamicSections:d},detail:f,terminalWidth:T}=t,e=Xi(o),c=i();return $3t(e,m,async()=>c.toolPermissionContext,p,u,{session:a,toolUseContext:{options:{customSystemPrompt:k,appendSystemPrompt:g,systemPromptSnapshot:l},getMcp:t.getMcp,storageV5:t.storageV5,credentials:t.credentials},originalMessages:e,configuredWindow:c.autoCompactWindow,excludeDynamicSections:d,detail:f,terminalWidth:T})}async function zMo(t,a){let o=await PX(a),m=bo(a.session)?{...o,memoryFiles:[]}:o;return{type:"text",value:AWt(m),contextUsage:axo(m)}}function axo(t){let a=y(t);return{model:t.model,total_tokens:t.totalTokens,raw_max_tokens:t.rawMaxTokens,percentage:t.percentage,...a!==null&&{over_limit:{tokens_over:t.totalTokens-t.rawMaxTokens,kind:a}},categories:t.categories.map((o)=>({name:o.name,tokens:o.tokens,kind:o.kind})),mcp_tools:t.mcpTools.map((o)=>({name:o.name,server_name:o.serverName,tokens:o.tokens})),memory_files:t.memoryFiles.map((o)=>({path:o.path,type:o.type,tokens:o.tokens})),agents:t.agents.map((o)=>({agent_type:o.agentType,source:o.source,tokens:o.tokens})),...t.skills&&t.skills.skillFrontmatter.length>0&&{skills:t.skills.skillFrontmatter.map((o)=>({name:o.name,source:o.source,...o.pluginName!==void 0&&{plugin_name:o.pluginName},tokens:o.tokens}))}}}
export{TWt,AWt,PX,zMo,axo};

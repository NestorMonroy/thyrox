// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{$e}from"/$bunfs/root/chunk-jdw11prg.js";import{oTt}from"/$bunfs/root/chunk-mzmfq60a.js";import{LJn,l_t,Aa}from"/$bunfs/root/chunk-qpwbvc04.js";import{Un,jI}from"/$bunfs/root/chunk-7y5wjz4e.js";import{Eo}from"/$bunfs/root/chunk-bqzk1zdc.js";function _lt(o){let r=x(o);if(r===null)return null;let e=Un(o.totalTokens-o.rawMaxTokens),l=Un(o.rawMaxTokens);if(r==="hard_limit"){let m=$e(process.env.DISABLE_COMPACT)?"/clear":"/compact or /clear";return`Context exceeds the ${l}-token limit by ${e} tokens \u2014 run ${m} to continue.`}let i=$e(process.env.DISABLE_COMPACT)?"/clear":"/compact";return`Context is ${e} tokens past the ${l}-token compaction window \u2014 run ${i} to reduce usage.`}function x(o){if(o.totalTokens<=o.rawMaxTokens)return null;return o.autocompactSource==="auto"?"hard_limit":"compaction_window"}function blt(o,r){let{categories:e,totalTokens:l,rawMaxTokens:i,percentage:m,model:T,memoryFiles:u,mcpTools:g,agents:k,skills:p,messageBreakdown:y,systemTools:f,systemPromptSections:c}=o,t=`## Context Usage

`;t+=`**Model:** ${T}  
`,t+=`**Tokens:** ${Un(l)} / ${Un(i)} (${m}%)
`;let d=_lt(o);if(d)t+=`**Over limit:** ${d}
`;t+=`
`;let C=e.filter((n)=>n.tokens>0&&n.name!=="Free space"&&n.name!=="Autocompact buffer");if(C.length>0){t+=`### Estimated usage by category

`,t+=`| Category | Tokens | Percentage |
`,t+=`|----------|--------|------------|
`;for(let a of C){let S=(a.tokens/i*100).toFixed(1);t+=`| ${a.name} | ${Un(a.tokens)} | ${S}% |
`}let n=e.find((a)=>a.name==="Free space");if(n&&n.tokens>0){let a=(n.tokens/i*100).toFixed(1);t+=`| Free space | ${Un(n.tokens)} | ${a}% |
`}let s=e.find((a)=>a.name==="Autocompact buffer");if(s&&s.tokens>0){let a=(s.tokens/i*100).toFixed(1);t+=`| Autocompact buffer | ${Un(s.tokens)} | ${a}% |
`}t+=`
`}if(g.length>0){t+=`### MCP Tools

`,t+=`| Tool | Server | Tokens |
`,t+=`|------|--------|--------|
`;for(let n of g)t+=`| ${n.name} | ${n.serverName} | ${Un(n.tokens)} |
`;t+=`
`}if(f&&f.length>0,c&&c.length>0,k.length>0){t+=`### Custom Agents

`,t+=`| Agent Type | Source | Tokens |
`,t+=`|------------|--------|--------|
`;for(let n of k){let s;switch(n.source){case"projectSettings":s="Project";break;case"userSettings":s="User";break;case"localSettings":s="Local";break;case"flagSettings":s="Flag";break;case"policySettings":s="Policy";break;case"plugin":s="Plugin";break;case"built-in":s="Built-in";break;default:s=String(n.source)}t+=`| ${n.agentType} | ${s} | ${Un(n.tokens)} |
`}t+=`
`}if(u.length>0){t+=`### Memory Files

`,t+=`| Type | Path | Tokens |
`,t+=`|------|------|--------|
`;for(let n of u)t+=`| ${n.type} | ${n.path} | ${Un(n.tokens)} |
`;t+=`
`}if(p&&p.tokens>0&&p.skillFrontmatter.length>0){t+=`### Skills

`,t+=`| Skill | Source | Tokens |
`,t+=`|-------|--------|--------|
`;for(let n of p.skillFrontmatter){let s=oTt(n.source)+(n.pluginName?` (${n.pluginName})`:"");t+=`| ${n.name} | ${s} | ${jI(n.tokens)} |
`}t+=`
`}return t}async function oPe(o){let{session:r,messages:e,getAppState:l,options:{mainLoopModel:i,tools:m,agentDefinitions:T,customSystemPrompt:u,appendSystemPrompt:g,appendSubagentSystemPrompt:k,systemPromptSnapshot:p,excludeDynamicSections:y},detail:f}=o,c=Aa(e),t=l();return l_t(c,i,async()=>t.toolPermissionContext,m,T,{session:r,toolUseContext:{options:{customSystemPrompt:u,appendSystemPrompt:g,appendSubagentSystemPrompt:k,systemPromptSnapshot:p},getMcp:o.getMcp,storageV5:o.storageV5,credentials:o.credentials},originalMessages:c,configuredWindow:t.autoCompactWindow,excludeDynamicSections:y,detail:f})}async function VIr(o,r){let e=await oPe(r),l=Eo(r.session),i=l?{...e,memoryFiles:[]}:e;return{type:"text",value:blt(i,{skipCollapseStatus:l}),contextUsage:Vyr(i)}}function Vyr(o){let r=x(o);return{model:o.model,total_tokens:o.totalTokens,raw_max_tokens:o.rawMaxTokens,percentage:o.percentage,...r!==null&&{over_limit:{tokens_over:o.totalTokens-o.rawMaxTokens,kind:r}},categories:o.categories.map((e)=>({name:e.name,tokens:e.tokens,kind:LJn(e)})),mcp_tools:o.mcpTools.map((e)=>({name:e.name,server_name:e.serverName,tokens:e.tokens})),memory_files:o.memoryFiles.map((e)=>({path:e.path,type:e.type,tokens:e.tokens})),agents:o.agents.map((e)=>({agent_type:e.agentType,source:e.source,tokens:e.tokens})),...o.skills&&o.skills.skillFrontmatter.length>0&&{skills:o.skills.skillFrontmatter.map((e)=>({name:e.name,source:e.source,...e.pluginName!==void 0&&{plugin_name:e.pluginName},tokens:e.tokens}))}}}
export{_lt,blt,oPe,VIr,Vyr};

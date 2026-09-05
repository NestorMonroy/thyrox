// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{AO as i,BO as T,CO as r,DO as f}from"/$bunfs/root/_384.js";import{LOa as a,MOa as p,MSa as M,NOa as U,wSa as m}from"/$bunfs/root/_441.js";import{xxd as k}from"/$bunfs/root/_837.js";async function d(t){let{session:o,messages:e,getAppState:l,options:{mainLoopModel:c,tools:g,agentDefinitions:x,customSystemPrompt:u,appendSystemPrompt:C,excludeDynamicSections:y}}=t,s=m(e),n=l();return p(s,c,async()=>n.toolPermissionContext,g,x,{session:o,toolUseContext:{options:{customSystemPrompt:u,appendSystemPrompt:C},getMcp:t.getMcp,storageV5:t.storageV5,credentials:t.credentials},originalMessages:s,configuredWindow:n.autoCompactWindow,excludeDynamicSections:y})}async function W(t,o){let e=await d(o);return{type:"text",value:r(e),contextUsage:S(e)}}function S(t){let o=i(t);return{model:t.model,total_tokens:t.totalTokens,raw_max_tokens:t.rawMaxTokens,percentage:t.percentage,...o!==null&&{over_limit:{tokens_over:t.totalTokens-t.rawMaxTokens,kind:o}},categories:t.categories.map((e)=>({name:e.name,tokens:e.tokens,kind:a(e)})),mcp_tools:t.mcpTools.map((e)=>({name:e.name,server_name:e.serverName,tokens:e.tokens})),memory_files:t.memoryFiles.map((e)=>({path:e.path,type:e.type,tokens:e.tokens})),agents:t.agents.map((e)=>({agent_type:e.agentType,source:e.source,tokens:e.tokens})),...t.skills&&t.skills.skillFrontmatter.length>0&&{skills:t.skills.skillFrontmatter.map((e)=>({name:e.name,source:e.source,...e.pluginName!==void 0&&{plugin_name:e.pluginName},tokens:e.tokens}))}}}var D=k(()=>{U();M();T();f()});
export{d as vO,W as wO,S as xO,D as yO};

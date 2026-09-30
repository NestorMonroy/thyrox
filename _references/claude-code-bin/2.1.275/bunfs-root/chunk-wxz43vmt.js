// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Au}from"/$bunfs/root/chunk-d5d0zdsy.js";import{AHn}from"/$bunfs/root/chunk-mdt3sxrw.js";import{fa}from"/$bunfs/root/chunk-3dnrd59g.js";import{zn,Sb}from"/$bunfs/root/chunk-jwwjyyqr.js";import{XS,gc,Ae,Dr}from"/$bunfs/root/chunk-q2gh92k2.js";import{DOe}from"/$bunfs/root/chunk-3gq7tnw7.js";import{gp}from"/$bunfs/root/chunk-stsvx00v.js";var w=/^\/btw\b/gi,T="_/btw can't run tools: any tool calls or tool output shown above were not executed and may not reflect your actual files or data. Ask in the main conversation to check._",A="(That answer wrote tool calls as text. Nothing was executed, so it is omitted here.)",h="_(This answer was cut off before it finished. Ask again to retry.)_",M="(That answer was cut off before it finished, so it is omitted here.)";function AXt(t){let r=[],n=t.matchAll(w);for(let o of n)if(o.index!==void 0)r.push({word:o[0],start:o.index,end:o.index+o[0].length});return r}async function Dze({question:t,cacheSafeParams:r,parentController:n,onRetry:o,threadHistory:a=!0,history:i}){let c=`<system-reminder>This is a side question from the user. You must answer this question directly in a single response.

IMPORTANT CONTEXT:
- You are a separate, lightweight agent spawned to answer this one question
- The main agent is NOT interrupted - it continues working independently in the background
- You share the conversation context but are a completely separate instance
- Do NOT reference being interrupted or what you were "previously doing" - that framing is incorrect

CRITICAL CONSTRAINTS:
- You have NO tools available - you cannot read files, run commands, search, or take any actions
- Do NOT write tool calls or tool output as text (for example invoke or function_calls XML blocks) - nothing you write here is executed; if answering would need reading files, running commands, or searching, say that can't be checked from a side question and suggest asking in the main conversation
- This is a one-off response - there will be no follow-up turns
- You can ONLY provide information based on what you already know from the conversation context
- NEVER say things like "Let me try...", "I'll now...", "Let me check...", or promise to take any action
- If you don't know the answer, say so - do not offer to look it up or investigate

Simply answer the question with the information you have.</system-reminder>

${t}`,e=n?Sb(n):zn(),p=a?r.toolUseContext.session.btwHistory:null,b=(i??p?.exchanges??[]).flatMap((s)=>{let u=AHn(s.response)?A:s.response.endsWith(h)?M:s.response;return[Ae({content:s.question}),gc({content:s.fallbackNotice?`\u26A0 ${s.fallbackNotice}

${u}`:u})]});try{let s=await XS({promptMessages:[...b,Ae({content:c})],cacheSafeParams:r,canUseTool:async()=>({behavior:"deny",message:"Side questions cannot use tools",decisionReason:{type:"other",reason:"side_question"}}),querySource:"side_question",forkLabel:"side_question",maxTurns:1,skipCacheWrite:!0,skipTranscript:!0,overrides:{abortController:e},onMessage:o?(l)=>{if(g(l))o({retryAttempt:l.retryAttempt,maxRetries:l.maxRetries,retryInMs:l.retryInMs,status:l.error.status})}:void 0}),{live:u,notice:d}=DOe(s.messages),{response:f,synthetic:m}=E(u),y=d&&{originalModel:d.originalModel,fallbackModel:d.fallbackModel,content:d.content};if(p&&f&&!m)p.append(t,f,y?.content);return{response:f,synthetic:m,usage:s.totalUsage,...y&&!m&&{refusalFallback:y}}}catch(s){if(s instanceof Au||e.signal.aborted)return{response:null,synthetic:!1,usage:gp,aborted:!0};throw s}}function E(t){let r=t.flatMap((e)=>e.type==="assistant"&&!e.isApiErrorMessage?e.message.content:[]),n=t.find((e)=>e.type==="assistant"&&e.isApiErrorMessage===!0),o=Dr(r,`

`).trim();if(o){let e=[...AHn(o)?[T]:[],...n?[h]:[]];return{response:[o,...e].join(`

`),synthetic:!1}}let a=r.find((e)=>e.type==="tool_use");if(a)return{response:`(The model tried to call ${"name"in a?a.name:"a tool"} instead of answering directly. Try rephrasing or ask in the main conversation.)`,synthetic:!0};let i=n?Dr(n.message.content,`

`).trim():"";if(i)return{response:`(API error: ${i.startsWith(`${fa}: `)?i.slice(fa.length+2):i})`,synthetic:!0};let c=t.find(g);if(c)return{response:`(API error: ${c.error.formatted})`,synthetic:!0};return{response:null,synthetic:!1}}function g(t){return t.type==="system"&&"subtype"in t&&t.subtype==="api_error"}
export{AXt,Dze};

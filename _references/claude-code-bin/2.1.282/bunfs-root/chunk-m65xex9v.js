// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ga}from"/$bunfs/root/chunk-63sndd1w.js";import{v3n}from"/$bunfs/root/chunk-gwjx17sy.js";import{su}from"/$bunfs/root/chunk-dw9y6h6j.js";import{Wn,Qy}from"/$bunfs/root/chunk-85t55br7.js";import{Kv,qc,Ae,Xr}from"/$bunfs/root/chunk-c9jscxk0.js";import{LS}from"/$bunfs/root/chunk-d0xj2cxk.js";import{ije}from"/$bunfs/root/chunk-2xaffgrh.js";import{gf}from"/$bunfs/root/chunk-tvfv76nc.js";var A=/^\/btw\b/gi,M="_/btw can't run tools: any tool calls or tool output shown above were not executed and may not reflect your actual files or data. Ask in the main conversation to check._",_="(That answer wrote tool calls as text. Nothing was executed, so it is omitted here.)",b="_(This answer was cut off before it finished. Ask again to retry.)_",E="(That answer was cut off before it finished, so it is omitted here.)",k="[No result yet \u2014 this call is still in progress in the main conversation (running, awaiting approval, or queued)]";function wbn(o){let n=[],i=o.matchAll(A);for(let s of i)if(s.index!==void 0)n.push({word:s[0],start:s.index,end:s.index+s[0].length});return n}async function nXe({question:o,cacheSafeParams:n,parentController:i,onRetry:s,threadHistory:l=!0,history:a,turnInProgress:e=!0}){let g=i?Qy(i):Wn(),p=l?n.toolUseContext.session.btwHistory:null,w=(a??p?.exchanges??[]).flatMap((r)=>{let u=v3n(r.response)?_:r.response.endsWith(b)?E:r.response;return[Ae({content:r.question}),qc({content:r.fallbackNotice?`\u26A0 ${r.fallbackNotice}

${u}`:u})]}),h=e?x(n.forkContextMessages):void 0;try{let r=await Kv({promptMessages:[...h?[h]:[],...w,Ae({content:[{type:"text",text:`<system-reminder>This is a side question from the user. You must answer this question directly in a single response.

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

`},{type:"text",text:o}]})],cacheSafeParams:n,canUseTool:async()=>({behavior:"deny",message:"Side questions cannot use tools",decisionReason:{type:"other",reason:"side_question"}}),querySource:"side_question",forkLabel:"side_question",maxTurns:1,skipCacheWrite:!0,skipTranscript:!0,overrides:{abortController:g},onMessage:s?(c)=>{if(T(c))s({retryAttempt:c.retryAttempt,maxRetries:c.maxRetries,retryInMs:c.retryInMs,status:c.error.status})}:void 0}),{live:u,notice:d}=ije(r.messages),{response:f,synthetic:m}=N(u),y=d&&{originalModel:d.originalModel,fallbackModel:d.fallbackModel,content:d.content};if(p&&f&&!m)p.append(o,f,y?.content);return{response:f,synthetic:m,usage:r.totalUsage,...y&&!m&&{refusalFallback:y}}}catch(r){if(r instanceof su||g.signal.aborted)return{response:null,synthetic:!1,usage:gf,aborted:!0};throw r}}function x(o){let n=o.filter((e)=>!LS(e)),i=n.findLast((e)=>e.type==="assistant");if(!i)return;let s=new Set,l=[];for(let e of n)if(e.type==="user"&&Array.isArray(e.message.content)){for(let t of e.message.content)if(t.type==="tool_result")s.add(t.tool_use_id)}else if(e.type==="assistant"&&e.message.id===i.message.id){for(let t of e.message.content)if(t.type==="tool_use")l.push(t.id)}let a=l.filter((e)=>!s.has(e));if(a.length===0)return;return Ae({content:a.map((e)=>({type:"tool_result",tool_use_id:e,content:k})),isMeta:!0})}function N(o){let n=o.flatMap((t)=>t.type==="assistant"&&!t.isApiErrorMessage?t.message.content:[]),i=o.find((t)=>t.type==="assistant"&&t.isApiErrorMessage===!0),s=Xr(n,`

`).trim();if(s){let t=[...v3n(s)?[M]:[],...i?[b]:[]];return{response:[s,...t].join(`

`),synthetic:!1}}let l=n.find((t)=>t.type==="tool_use");if(l)return{response:`(The model tried to call ${"name"in l?l.name:"a tool"} instead of answering directly. Try rephrasing or ask in the main conversation.)`,synthetic:!0};let a=i?Xr(i.message.content,`

`).trim():"";if(a)return{response:`(API error: ${a.startsWith(`${ga}: `)?a.slice(ga.length+2):a})`,synthetic:!0};let e=o.find(T);if(e)return{response:`(API error: ${e.error.formatted})`,synthetic:!0};return{response:null,synthetic:!1}}function T(o){return o.type==="system"&&"subtype"in o&&o.subtype==="api_error"}
export{wbn,nXe};

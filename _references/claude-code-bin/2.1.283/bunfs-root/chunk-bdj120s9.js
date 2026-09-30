// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{va}from"/$bunfs/root/chunk-mmqkf96q.js";import{Ttr}from"/$bunfs/root/chunk-b58aes3d.js";import{bu}from"/$bunfs/root/chunk-ern0s5ks.js";import{Nn,Ph}from"/$bunfs/root/chunk-75tfzg1z.js";import{pE,Sc,Ae,eo}from"/$bunfs/root/chunk-csayct82.js";import{fw}from"/$bunfs/root/chunk-krvvng0a.js";import{kGe}from"/$bunfs/root/chunk-qrmg14b4.js";import{Hp}from"/$bunfs/root/chunk-b9kqqt4n.js";var A=/^\/btw\b/gi,M="_/btw can't run tools: any tool calls or tool output shown above were not executed and may not reflect your actual files or data. Ask in the main conversation to check._",_="(That answer wrote tool calls as text. Nothing was executed, so it is omitted here.)",b="_(This answer was cut off before it finished. Ask again to retry.)_",E="(That answer was cut off before it finished, so it is omitted here.)",k="[No result yet \u2014 this call is still in progress in the main conversation (running, awaiting approval, or queued)]";function nEn(o){let n=[],i=o.matchAll(A);for(let s of i)if(s.index!==void 0)n.push({word:s[0],start:s.index,end:s.index+s[0].length});return n}async function t7e({question:o,cacheSafeParams:n,parentController:i,onRetry:s,threadHistory:l=!0,history:a,turnInProgress:e=!0}){let g=i?Ph(i):Nn(),p=l?n.toolUseContext.session.btwHistory:null,w=(a??p?.exchanges??[]).flatMap((r)=>{let u=Ttr(r.response)?_:r.response.endsWith(b)?E:r.response;return[Ae({content:r.question}),Sc({content:r.fallbackNotice?`\u26A0 ${r.fallbackNotice}

${u}`:u})]}),h=e?x(n.forkContextMessages):void 0;try{let r=await pE({promptMessages:[...h?[h]:[],...w,Ae({content:[{type:"text",text:`<system-reminder>This is a side question from the user. You must answer this question directly in a single response.

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

`},{type:"text",text:o}]})],cacheSafeParams:n,canUseTool:async()=>({behavior:"deny",message:"Side questions cannot use tools",decisionReason:{type:"other",reason:"side_question"}}),querySource:"side_question",forkLabel:"side_question",maxTurns:1,skipCacheWrite:!0,skipTranscript:!0,overrides:{abortController:g},onMessage:s?(c)=>{if(T(c))s({retryAttempt:c.retryAttempt,maxRetries:c.maxRetries,retryInMs:c.retryInMs,status:c.error.status})}:void 0}),{live:u,notice:d}=kGe(r.messages),{response:f,synthetic:m}=N(u),y=d&&{originalModel:d.originalModel,fallback
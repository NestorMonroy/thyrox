// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{oc}from"/$bunfs/root/chunk-058caznt.js";import{br,Ly}from"/$bunfs/root/chunk-8nj3fpx9.js";import{tA,_Ee,Xc,Ie,Pr}from"/$bunfs/root/chunk-qpwbvc04.js";import{pm}from"/$bunfs/root/chunk-mrsbyrhq.js";var b=/^\/btw\b/gi;function _Dt(t){let r=[],n=t.matchAll(b);for(let e of n)if(e.index!==void 0)r.push({word:e[0],start:e.index,end:e.index+e[0].length});return r}async function rLe({question:t,cacheSafeParams:r,parentController:n,onRetry:e,threadHistory:s=!0,history:a}){let f=`<system-reminder>This is a side question from the user. You must answer this question directly in a single response.

IMPORTANT CONTEXT:
- You are a separate, lightweight agent spawned to answer this one question
- The main agent is NOT interrupted - it continues working independently in the background
- You share the conversation context but are a completely separate instance
- Do NOT reference being interrupted or what you were "previously doing" - that framing is incorrect

CRITICAL CONSTRAINTS:
- You have NO tools available - you cannot read files, run commands, search, or take any actions
- This is a one-off response - there will be no follow-up turns
- You can ONLY provide information based on what you already know from the conversation context
- NEVER say things like "Let me try...", "I'll now...", "Let me check...", or promise to take any action
- If you don't know the answer, say so - do not offer to look it up or investigate

Simply answer the question with the information you have.</system-reminder>

${t}`,y=n?Ly(n):br(),c=s?r.toolUseContext.session.btwHistory:null,h=(a??c?.exchanges??[]).flatMap((o)=>[Ie({content:o.question}),Xc({content:o.fallbackNotice?`\u26A0 ${o.fallbackNotice}

${o.response}`:o.response})]);try{let o=await tA({promptMessages:[...h,Ie({content:f})],cacheSafeParams:r,canUseTool:async()=>({behavior:"deny",message:"Side questions cannot use tools",decisionReason:{type:"other",reason:"side_question"}}),querySource:"side_question",forkLabel:"side_question",maxTurns:1,skipCacheWrite:!0,skipTranscript:!0,overrides:{abortController:y},onMessage:e?(i)=>{if(m(i))e({retryAttempt:i.retryAttempt,maxRetries:i.maxRetries,retryInMs:i.retryInMs,status:i.error.status})}:void 0}),{live:g,notice:l}=_Ee(o.messages),{response:u,synthetic:p}=w(g),d=l&&{originalModel:l.originalModel,fallbackModel:l.fallbackModel,content:l.content};if(c&&u&&!p)c.append(t,u,d?.content);return{response:u,synthetic:p,usage:o.totalUsage,...d&&!p&&{refusalFallback:d}}}catch(o){if(o instanceof oc||y.signal.aborted)return{response:null,synthetic:!1,usage:pm,aborted:!0};throw o}}function w(t){let r=t.flatMap((e)=>e.type==="assistant"?e.message.content:[]);if(r.length>0){let e=Pr(r,`

`).trim();if(e)return{response:e,synthetic:!1};let s=r.find((a)=>a.type==="tool_use");if(s)return{response:`(The model tried to call ${"name"in s?s.name:"a tool"} instead of answering directly. Try rephrasing or ask in the main conversation.)`,synthetic:!0}}let n=t.find(m);if(n)return{response:`(API error: ${n.error.formatted})`,synthetic:!0};return{response:null,synthetic:!1}}function m(t){return t.type==="system"&&"subtype"in t&&t.subtype==="api_error"}
export{_Dt,rLe};

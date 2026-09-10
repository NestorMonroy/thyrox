// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{MSa as P,WLa as M,_La as E,asa as w,bsa as I,cSa as T,rRa as k,uRa as y}from"/$bunfs/root/_441.js";import{YUb as g,ZUb as b,oVb as C}from"/$bunfs/root/_606.js";import{A9b as h,B9b as R}from"/$bunfs/root/_660.js";import{owd as S}from"/$bunfs/root/_834.js";import{vwd as f}from"/$bunfs/root/_835.js";S();R();C();I();P();E();var q=/^\/btw\b/gi;function F(t){let r=[],n=t.matchAll(q);for(let e of n)if(e.index!==void 0)r.push({word:e[0],start:e.index,end:e.index+e[0].length});return r}async function j({question:t,cacheSafeParams:r,parentController:n,onRetry:e,threadHistory:s=!0,history:a}){let N=`<system-reminder>This is a side question from the user. You must answer this question directly in a single response.

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

${t}`,m=n?b(n):g(),c=s?r.toolUseContext.session.btwHistory:null,v=(a??c?.exchanges??[]).flatMap((o)=>[y({content:o.question}),k({content:o.fallbackNotice?`\u26A0 ${o.fallbackNotice}

${o.response}`:o.response})]);try{let o=await w({promptMessages:[...v,y({content:N})],cacheSafeParams:r,canUseTool:async()=>({behavior:"deny",message:"Side questions cannot use tools",decisionReason:{type:"other",reason:"side_question"}}),querySource:"side_question",forkLabel:"side_question",maxTurns:1,skipCacheWrite:!0,skipTranscript:!0,overrides:{abortController:m},onMessage:e?(i)=>{if(A(i))e({retryAttempt:i.retryAttempt,maxRetries:i.maxRetries,retryInMs:i.retryInMs,status:i.error.status})}:void 0}),{live:x,notice:l}=M(o.messages),{response:u,synthetic:p}=U(x),d=l&&{originalModel:l.originalModel,fallbackModel:l.fallbackModel,content:l.content};if(c&&u&&!p)c.append(t,u,d?.content);return{response:u,synthetic:p,usage:o.totalUsage,...d&&!p&&{refusalFallback:d}}}catch(o){if(o instanceof f||m.signal.aborted)return{response:null,synthetic:!1,usage:h,aborted:!0};throw o}}function U(t){let r=t.flatMap((e)=>e.type==="assistant"?e.message.content:[]);if(r.length>0){let e=T(r,`

`).trim();if(e)return{response:e,synthetic:!1};let s=r.find((a)=>a.type==="tool_use");if(s)return{response:`(The model tried to call ${"name"in s?s.name:"a tool"} instead of answering directly. Try rephrasing or ask in the main conversation.)`,synthetic:!0}}let n=t.find(A);if(n)return{response:`(API error: ${n.error.formatted})`,synthetic:!0};return{response:null,synthetic:!1}}function A(t){return t.type==="system"&&"subtype"in t&&t.subtype==="api_error"}
export{F as Br,j as Cr};

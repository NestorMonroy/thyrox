// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{$n}from"/$bunfs/root/chunk-00hz8tf7.js";import{jC,Xi}from"/$bunfs/root/chunk-4n4g22z6.js";import{k8e}from"/$bunfs/root/chunk-rvznzh1x.js";function c3n(s,o=!0){let r=s.at(-1),a=o&&r?.type==="assistant"&&r.message.stop_reason===null;return Xi(a?s.slice(0,-1):[...s])}async function SBt({question:s,history:o,parentController:r,onProgress:a,getLiveMessages:l,isTurnInProgress:p,buildFallbackParams:i}){let u=p?.()??!0,n=jC(),c=n?{...n,toolUseContext:{...n.toolUseContext,abortController:$n()},...l&&{forkContextMessages:c3n(l(),u),advisorModel:n.toolUseContext.getAdvisorSetting()}}:i?await i():null;if(c===null)return{cancelled:!1,response:{response:null,synthetic:!1}};a({status:"started"});let t=await k8e({question:s,cacheSafeParams:c,parentController:r,onRetry:(e)=>a({status:"api_retry",attempt:e.retryAttempt,max_retries:e.maxRetries,retry_delay_ms:e.retryInMs,error_status:e.status??null}),threadHistory:!1,turnInProgress:u,...o?.length&&{history:o.map((e)=>({question:e.question,response:e.response,...e.fallback_notice&&{fallbackNotice:e.fallback_notice}}))}});if(t.aborted||r.signal.aborted)return{cancelled:!0};return{cancelled:!1,response:{response:t.response,synthetic:t.synthetic,...t.refusalFallback&&{refusal_fallback:{original_model:t.refusalFallback.originalModel,fallback_model:t.refusalFallback.fallbackModel,content:t.refusalFallback.content}}}}}
export{c3n,SBt};

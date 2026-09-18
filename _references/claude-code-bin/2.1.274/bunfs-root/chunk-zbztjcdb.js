// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{qn}from"/$bunfs/root/chunk-37z9d217.js";import{PR,Pi}from"/$bunfs/root/chunk-ayyj05ne.js";import{$je}from"/$bunfs/root/chunk-e5gpgkyz.js";function wCn(s){let r=s.at(-1);return Pi(r?.type==="assistant"&&r.message.stop_reason===null?s.slice(0,-1):s)}async function lAt({question:s,history:r,parentController:a,onProgress:n,getLiveMessages:l,buildFallbackParams:i}){let o=PR(),u=o?{...o,toolUseContext:{...o.toolUseContext,abortController:qn()},...l&&{forkContextMessages:wCn(l()),advisorModel:o.toolUseContext.getAdvisorSetting()}}:i?await i():null;if(u===null)return{cancelled:!1,response:{response:null,synthetic:!1}};n({status:"started"});let t=await $je({question:s,cacheSafeParams:u,parentController:a,onRetry:(e)=>n({status:"api_retry",attempt:e.retryAttempt,max_retries:e.maxRetries,retry_delay_ms:e.retryInMs,error_status:e.status??null}),threadHistory:!1,...r?.length&&{history:r.map((e)=>({question:e.question,response:e.response,...e.fallback_notice&&{fallbackNotice:e.fallback_notice}}))}});if(t.aborted||a.signal.aborted)return{cancelled:!0};return{cancelled:!1,response:{response:t.response,synthetic:t.synthetic,...t.refusalFallback&&{refusal_fallback:{original_model:t.refusalFallback.originalModel,fallback_model:t.refusalFallback.fallbackModel,content:t.refusalFallback.content}}}}}
export{wCn,lAt};

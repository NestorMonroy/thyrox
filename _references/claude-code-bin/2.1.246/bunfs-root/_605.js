// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{YUb as a,oVb as m}from"/$bunfs/root/_606.js";import{xxd as l}from"/$bunfs/root/_837.js";function c(r,d){let{signalB:o,timeoutMs:i,refTimer:u}=d??{},n=a();if(r?.aborted||o?.aborted)return n.abort(),{signal:n.signal,cleanup:()=>{}};let e,t=()=>{if(e!==void 0)clearTimeout(e);n.abort()};if(i!==void 0){if(e=setTimeout(t,i),!u)e.unref?.()}r?.addEventListener("abort",t),o?.addEventListener("abort",t);let b=()=>{if(e!==void 0)clearTimeout(e);r?.removeEventListener("abort",t),o?.removeEventListener("abort",t)};return{signal:n.signal,cleanup:b}}var s=l(()=>{m()});
export{c as WUb,s as XUb};

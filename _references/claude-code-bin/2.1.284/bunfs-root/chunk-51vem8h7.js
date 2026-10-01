// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{mt,zct}from"/$bunfs/root/chunk-w9ad6z7j.js";import{r$e,WAe}from"/$bunfs/root/chunk-0ckh9sq5.js";import{wVe}from"/$bunfs/root/chunk-9cqsjbtd.js";async function ap(r,e,o,t){let a=mt(r.slug);if(!!e.toolUseId&&a?.lastProbeToolUseId===e.toolUseId)return;let s=Date.now(),[l]=await Promise.all([wVe(r,e.abortController.signal,e.credentials,t),WAe()?r$e(r,e.abortController.signal):void 0]);zct(r.slug,l,{consumedByCheck:!0,toolUseId:e.toolUseId,issuedAt:s,debugLabel:o})}async function B8t(r,e,o){let t=Date.now(),a=await wVe(r,e.abortController.signal,e.credentials);zct(r.slug,a,{consumedByCheck:!1,toolUseId:e.toolUseId,issuedAt:t,debugLabel:o})}
export{ap,B8t};

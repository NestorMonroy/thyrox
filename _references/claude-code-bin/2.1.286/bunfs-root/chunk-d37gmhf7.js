// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{mt,_ut}from"/$bunfs/root/chunk-sxsmhx1z.js";import{iFe,aCe}from"/$bunfs/root/chunk-d64a4mxs.js";import{hqe}from"/$bunfs/root/chunk-jvmyqck8.js";async function Tu(r,e,o,t){let a=mt(r.slug);if(!!e.toolUseId&&a?.lastProbeToolUseId===e.toolUseId)return;let s=Date.now(),[l]=await Promise.all([hqe(r,e.abortController.signal,e.credentials,t),aCe()?iFe(r,e.abortController.signal):void 0]);_ut(r.slug,l,{consumedByCheck:!0,toolUseId:e.toolUseId,issuedAt:s,debugLabel:o})}async function pXt(r,e,o){let t=Date.now(),a=await hqe(r,e.abortController.signal,e.credentials);_ut(r.slug,a,{consumedByCheck:!1,toolUseId:e.toolUseId,issuedAt:t,debugLabel:o})}
export{Tu,pXt};

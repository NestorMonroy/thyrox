// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{ht,Tct}from"/$bunfs/root/chunk-xzdfkh30.js";import{BNe,gAe}from"/$bunfs/root/chunk-4gj6tdpa.js";import{ZGe}from"/$bunfs/root/chunk-jzmnrdz1.js";async function np(r,e,o,t){let a=ht(r.slug);if(!!e.toolUseId&&a?.lastProbeToolUseId===e.toolUseId)return;let s=Date.now(),[l]=await Promise.all([ZGe(r,e.abortController.signal,e.credentials,t),gAe()?BNe(r,e.abortController.signal):void 0]);Tct(r.slug,l,{consumedByCheck:!0,toolUseId:e.toolUseId,issuedAt:s,debugLabel:o})}async function GYt(r,e,o){let t=Date.now(),a=await ZGe(r,e.abortController.signal,e.credentials);Tct(r.slug,a,{consumedByCheck:!1,toolUseId:e.toolUseId,issuedAt:t,debugLabel:o})}
export{np,GYt};

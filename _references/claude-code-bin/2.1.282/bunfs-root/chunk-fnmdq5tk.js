// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ft,iKe}from"/$bunfs/root/chunk-303y9mv1.js";import{$Me,MEe}from"/$bunfs/root/chunk-4j8jkcm5.js";import{xPe}from"/$bunfs/root/chunk-qbr8e723.js";async function $u(r,e,o){let t=ft(r.slug);if(!!e.toolUseId&&t?.lastProbeToolUseId===e.toolUseId)return;let s=Date.now(),[l]=await Promise.all([xPe(r,e.abortController.signal,e.credentials),MEe()?$Me(r,e.abortController.signal):void 0]);iKe(r.slug,l,{consumedByCheck:!0,toolUseId:e.toolUseId,issuedAt:s,debugLabel:o})}async function fKt(r,e,o){let t=Date.now(),a=await xPe(r,e.abortController.signal,e.credentials);iKe(r.slug,a,{consumedByCheck:!1,toolUseId:e.toolUseId,issuedAt:t,debugLabel:o})}
export{$u,fKt};

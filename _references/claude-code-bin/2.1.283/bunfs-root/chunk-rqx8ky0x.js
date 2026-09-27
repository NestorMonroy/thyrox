// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{ft,T3e}from"/$bunfs/root/chunk-a5gr8vm3.js";import{XLe,$Te}from"/$bunfs/root/chunk-fkbcp6q9.js";import{UHe}from"/$bunfs/root/chunk-vag6ng91.js";async function Yu(r,e,o){let t=ft(r.slug);if(!!e.toolUseId&&t?.lastProbeToolUseId===e.toolUseId)return;let s=Date.now(),[l]=await Promise.all([UHe(r,e.abortController.signal,e.credentials),$Te()?XLe(r,e.abortController.signal):void 0]);T3e(r.slug,l,{consumedByCheck:!0,toolUseId:e.toolUseId,issuedAt:s,debugLabel:o})}async function u6t(r,e,o){let t=Date.now(),a=await UHe(r,e.abortController.signal,e.credentials);T3e(r.slug,a,{consumedByCheck:!1,toolUseId:e.toolUseId,issuedAt:t,debugLabel:o})}
export{Yu,u6t};

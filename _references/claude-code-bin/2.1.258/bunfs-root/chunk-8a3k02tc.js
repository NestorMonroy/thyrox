// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{vr,Ndn}from"/$bunfs/root/chunk-vw215j9f.js";import{uKe}from"/$bunfs/root/chunk-n027b75r.js";async function eC(r,e,o){let t=vr(r.slug);if(!!e.toolUseId&&t?.lastProbeToolUseId===e.toolUseId)return;let a=Date.now(),s=await uKe(r,e.abortController.signal,e.credentials);Ndn(r.slug,s,{consumedByCheck:!0,toolUseId:e.toolUseId,issuedAt:a,debugLabel:o})}
export{eC};

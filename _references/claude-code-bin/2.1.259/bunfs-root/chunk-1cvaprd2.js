// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{yr,Pmn}from"/$bunfs/root/chunk-qpwbvc04.js";import{f9e}from"/$bunfs/root/chunk-9qwzc5hc.js";async function vv(r,e,o){let t=yr(r.slug);if(!!e.toolUseId&&t?.lastProbeToolUseId===e.toolUseId)return;let a=Date.now(),s=await f9e(r,e.abortController.signal,e.credentials);Pmn(r.slug,s,{consumedByCheck:!0,toolUseId:e.toolUseId,issuedAt:a,debugLabel:o})}
export{vv};

// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{At,_5e,HNe}from"/$bunfs/root/chunk-qq8vrqdk.js";import{Tke,lme}from"/$bunfs/root/chunk-0pxnbc5f.js";async function ud(e,r,o){let t=At(e.slug);if(!!r.toolUseId&&t?.lastProbeToolUseId===r.toolUseId)return;let a=Date.now(),[s]=await Promise.all([HNe(e,r.abortController.signal,r.credentials),lme()?Tke(e,r.abortController.signal):void 0]);_5e(e.slug,s,{consumedByCheck:!0,toolUseId:r.toolUseId,issuedAt:a,debugLabel:o})}
export{ud};

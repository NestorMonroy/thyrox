// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{ft,SFe,cTe}from"/$bunfs/root/chunk-y4mqcs47.js";import{jAe,kge}from"/$bunfs/root/chunk-pfz1p5wm.js";async function Fu(r,e,o){let t=ft(r.slug);if(!!e.toolUseId&&t?.lastProbeToolUseId===e.toolUseId)return;let s=Date.now(),[l]=await Promise.all([cTe(r,e.abortController.signal,e.credentials),kge()?jAe(r,e.abortController.signal):void 0]);SFe(r.slug,l,{consumedByCheck:!0,toolUseId:e.toolUseId,issuedAt:s,debugLabel:o})}async function oLt(r,e,o){let t=Date.now(),a=await cTe(r,e.abortController.signal,e.credentials);SFe(r.slug,a,{consumedByCheck:!1,toolUseId:e.toolUseId,issuedAt:t,debugLabel:o})}
export{Fu,oLt};

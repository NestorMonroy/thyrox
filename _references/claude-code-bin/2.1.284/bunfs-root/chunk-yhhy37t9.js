// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{VA}from"/$bunfs/root/chunk-d37h8mav.js";import{Jr}from"/$bunfs/root/chunk-0j2vcydt.js";import{KT,cx,zo}from"/$bunfs/root/chunk-77kn462z.js";import{e8r}from"/$bunfs/root/chunk-8z8f3r9p.js";import{d$}from"/$bunfs/root/chunk-e8gcxqm3.js";import{Wr}from"/$bunfs/root/chunk-asz3893d.js";function nZn(e,r){return e8r(r.scope)&&!zo(e)}function uIe(e,r){return nZn(e,r)&&!o(r)}function o(e){return import.meta.require("/$bunfs/root/chunk-43sph2xd.js").mcpClientModule().isFirstPartyDesignServerConfig(e)}function rZn(e){switch(e.type){case void 0:case"stdio":case"http":case"sse":case"ws":return!0;case"sdk":case"sse-ide":case"ws-ide":case"claudeai-proxy":return!1}}function t(e){return Object.assign(KT(),Wr(e,rZn))}async function fje({storageV5:e}={}){if(VA()||Jr())return KT();await d$();let{servers:r}=await cx({},{purpose:"deviceBridge",storageV5:e});return t(r)}
export{nZn,uIe,rZn,fje};

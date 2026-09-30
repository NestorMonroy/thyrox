// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{PA}from"/$bunfs/root/chunk-nvht7ckf.js";import{Xr}from"/$bunfs/root/chunk-4cnes656.js";import{HT,jR,Uo}from"/$bunfs/root/chunk-csayct82.js";import{$4r}from"/$bunfs/root/chunk-jj7b587g.js";import{UN}from"/$bunfs/root/chunk-mhq8geb7.js";import{Qr}from"/$bunfs/root/chunk-7h88gd3q.js";function hXn(e,r){return $4r(r.scope)&&!Uo(e)}function Xxe(e,r){return hXn(e,r)&&!o(r)}function o(e){return import.meta.require("/$bunfs/root/chunk-dzbsscat.js").mcpClientModule().isFirstPartyDesignServerConfig(e)}function yXn(e){switch(e.type){case void 0:case"stdio":case"http":case"sse":case"ws":return!0;case"sdk":case"sse-ide":case"ws-ide":case"claudeai-proxy":return!1}}function t(e){return Object.assign(HT(),Qr(e,yXn))}async function YBe({storageV5:e}={}){if(PA()||Xr())return HT();await UN();let{servers:r}=await jR({},{purpose:"deviceBridge",storageV5:e});return t(r)}
export{hXn,Xxe,yXn,YBe};

// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{AE}from"/$bunfs/root/chunk-hbjpbz2q.js";import{Rr}from"/$bunfs/root/chunk-xz4v1m80.js";import{Vk,qk,yo}from"/$bunfs/root/chunk-kt4703ww.js";import{R7r}from"/$bunfs/root/chunk-hgbhrzwd.js";import{UI}from"/$bunfs/root/chunk-c38ncger.js";import{Gr}from"/$bunfs/root/chunk-6g5dctck.js";function jtr(e,r){return R7r(r.scope)&&!yo(e)}function rOe(e,r){return jtr(e,r)&&!o(r)}function o(e){return import.meta.require("/$bunfs/root/chunk-e83xnjx0.js").mcpClientModule().isFirstPartyDesignServerConfig(e)}function Wtr(e){switch(e.type){case void 0:case"stdio":case"http":case"sse":case"ws":return!0;case"sdk":case"sse-ide":case"ws-ide":case"claudeai-proxy":return!1}}function t(e){return Object.assign(Vk(),Gr(e,Wtr))}async function PWe({storageV5:e}={}){if(AE()||Rr())return Vk();await UI();let{servers:r}=await qk({},{purpose:"deviceBridge",storageV5:e});return t(r)}
export{jtr,rOe,Wtr,PWe};

// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{uE}from"/$bunfs/root/chunk-bxhyh54r.js";import{fo}from"/$bunfs/root/chunk-v34cw0y6.js";import{QT,Lk,To}from"/$bunfs/root/chunk-qazw855w.js";import{I8r}from"/$bunfs/root/chunk-z67b086g.js";import{HI}from"/$bunfs/root/chunk-5nrydz6h.js";import{Wr}from"/$bunfs/root/chunk-74ez0jks.js";function WQn(e,r){return I8r(r.scope)&&!To(e)}function tPe(e,r){return WQn(e,r)&&!o(r)}function o(e){return import.meta.require("/$bunfs/root/chunk-3kkwf2my.js").mcpClientModule().isFirstPartyDesignServerConfig(e)}function zQn(e){switch(e.type){case void 0:case"stdio":case"http":case"sse":case"ws":return!0;case"sdk":case"sse-ide":case"ws-ide":case"claudeai-proxy":return!1}}function t(e){return Object.assign(QT(),Wr(e,zQn))}async function bje({storageV5:e}={}){if(uE()||fo())return QT();await HI();let{servers:r}=await Lk({},{purpose:"deviceBridge",storageV5:e});return t(r)}
export{WQn,tPe,zQn,bje};

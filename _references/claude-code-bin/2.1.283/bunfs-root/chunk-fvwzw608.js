// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{jt}from"/$bunfs/root/chunk-bydh8jk1.js";var s=null;function kio(e){let n=s;return s=e,n}function l8t(){return s}var r=null;function Tio(e){let n=r;return r=e,n}async function k4(e){return await r?.(e)??!1}class bwe extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function Aio(e){let n=t;return t=e,n}function cHe(){return t}function c8t(e){let n=jt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function mpr(){let e=jt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function Cio(){let e=mpr();if(e)process.stderr.write(`${e}
`)}
export{kio,l8t,Tio,k4,bwe,Aio,cHe,c8t,mpr,Cio};

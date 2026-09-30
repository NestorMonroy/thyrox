// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Gt}from"/$bunfs/root/chunk-45j14f09.js";var s=null;function zdo(e){let n=s;return s=e,n}function BXt(){return s}var r=null;function Vdo(e){let n=r;return r=e,n}async function e5(e){return await r?.(e)??!1}class Rve extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function qdo(e){let n=t;return t=e,n}function vMe(){return t}function jXt(e){let n=Gt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function $gr(){let e=Gt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function Kdo(){let e=$gr();if(e)process.stderr.write(`${e}
`)}
export{zdo,BXt,Vdo,e5,Rve,qdo,vMe,jXt,$gr,Kdo};

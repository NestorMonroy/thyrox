// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Vt}from"/$bunfs/root/chunk-b3pxzdmn.js";var s=null;function OWn(e){let n=s;return s=e,n}function fdt(){return s}var r=null;function NWn(e){let n=r;return r=e,n}async function TF(e){return await r?.(e)??!1}class xte extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function FWn(e){let n=t;return t=e,n}function Jce(){return t}function pdt(e){let n=Vt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function Lsn(){let e=Vt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function BWn(){let e=Lsn();if(e)process.stderr.write(`${e}
`)}
export{OWn,fdt,NWn,TF,xte,FWn,Jce,pdt,Lsn,BWn};

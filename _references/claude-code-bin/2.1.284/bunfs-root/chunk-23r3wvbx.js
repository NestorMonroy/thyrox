// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{Rd}from"/$bunfs/root/chunk-pegpck1h.js";import{x}from"/$bunfs/root/chunk-swk3rjnt.js";import{o,A,u}from"/$bunfs/root/chunk-fwjxbyrt.js";var l=f(()=>A(u({marketplace:o(),plugin:o()})));function sCn(){let e=x("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function AQ(){return x("tengu_harbor",!1)}function Mwt(e){if(!e)return!1;let{name:n,marketplace:t}=Rd(e);if(!t)return!1;return sCn().some((r)=>r.plugin===n&&r.marketplace===t)}
export{sCn,AQ,Mwt};
